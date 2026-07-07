import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  buildZoekprofielFields,
  nlDate,
  type ZoekprofielBuildContext,
  type ZoekprofielFields,
} from './build-fields';
import { DEFAULT_ZOEKPROFIEL_MODEL } from './constants';
import {
  ZOEKPROFIEL_CONTENT_PROMPT,
  buildZoekprofielContextMessage,
  buildZoekprofielRetryMessage,
} from './prompt';
import {
  ZOEKPROFIEL_CONTENT_JSON_SCHEMA,
  parseZoekprofielContentResult,
  type ZoekprofielContentResult,
} from './schema';
import { formatValidationIssues } from './validate-output';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

export type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

type DocCategory = 'belastbaarheid' | 'ad' | 'intake';

const CATEGORY_PRIORITY: Record<DocCategory, number> = {
  belastbaarheid: 1,
  ad: 2,
  intake: 3,
};

export function getZoekprofielDocCategory(type: string | null | undefined): DocCategory | null {
  const t = (type || '').toLowerCase();
  if (
    t.includes('fml') ||
    t.includes('izp') ||
    t.includes('lab') ||
    t.includes('functiemogelijkhedenlijst') ||
    t.includes('inzetbaarheidsprofiel') ||
    t.includes('lijst arbeidsmogelijkheden')
  ) {
    return 'belastbaarheid';
  }
  if (t.includes('ad_rapport') || t.includes('ad_rapportage') || t.includes('arbeidsdeskundig')) {
    return 'ad';
  }
  if (t.includes('intakeformulier') || t.includes('intake-formulier') || t.includes('intake')) {
    return 'intake';
  }
  return null;
}

export function isBelastbaarheidsDoc(type: string | null | undefined): boolean {
  return getZoekprofielDocCategory(type) === 'belastbaarheid';
}

export function filterZoekprofielDocs(docs: EmployeeDoc[]): EmployeeDoc[] {
  return docs
    .map((doc) => ({
      doc,
      category: getZoekprofielDocCategory(doc.type),
    }))
    .filter((entry): entry is { doc: EmployeeDoc; category: DocCategory } => entry.category !== null)
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category])
    .map((entry) => entry.doc);
}

function getZoekprofielModel(): string {
  return process.env.OPENAI_ZOEKPROFIEL_MODEL?.trim() || DEFAULT_ZOEKPROFIEL_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_ZOEKPROFIEL_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadZoekprofielDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[]
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of filterZoekprofielDocs(docs)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Zoekprofiel: skipping document (combined size limit)', path);
      continue;
    }

    totalBytes += buffer.length;
    const uploadFile = buildOpenAIFile(buffer, path);
    const uploaded = await openai.files.create({
      file: uploadFile,
      purpose: 'assistants',
    });
    fileIds.push(uploaded.id);
  }

  return fileIds;
}

async function deleteUploadedFiles(openai: OpenAI, fileIds: string[]): Promise<void> {
  await Promise.all(fileIds.map((id) => openai.files.delete(id).catch(() => {})));
}

function buildApiContext(ctx: ZoekprofielBuildContext): Record<string, unknown> {
  return {
    meta: {
      fml_izp_lab_date_voluit: ctx.meta.fml_izp_lab_date_voluit || null,
      has_belastbaarheids_doc: ctx.meta.has_belastbaarheids_doc !== false,
    },
  };
}

type GenerateContentOptions = {
  retryHints?: string;
};

async function callZoekprofielModel(
  openai: OpenAI,
  fileIds: string[],
  ctx: ZoekprofielBuildContext,
  options?: GenerateContentOptions
): Promise<ZoekprofielContentResult> {
  const contextMessage = buildZoekprofielContextMessage(buildApiContext(ctx));
  const userContent: OpenAI.Responses.ResponseInputContent[] = [
    { type: 'input_text', text: contextMessage },
    ...fileIds.map(
      (file_id): OpenAI.Responses.ResponseInputContent => ({
        type: 'input_file',
        file_id,
      })
    ),
  ];

  if (options?.retryHints) {
    userContent.push({ type: 'input_text', text: options.retryHints });
  }

  const reasoningEffort = getReasoningEffort();
  const response = await openai.responses.create({
    model: getZoekprofielModel(),
    instructions: ZOEKPROFIEL_CONTENT_PROMPT,
    input: [{ role: 'user', content: userContent }],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    text: {
      format: {
        type: 'json_schema',
        name: 'zoekprofiel_content',
        strict: true,
        schema: ZOEKPROFIEL_CONTENT_JSON_SCHEMA as Record<string, unknown>,
      },
    },
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error('Empty response from model');
  }

  const parsed = JSON.parse(outputText) as unknown;
  return parseZoekprofielContentResult(parsed);
}

export async function generateZoekprofielContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: ZoekprofielBuildContext,
  docs: EmployeeDoc[],
  options?: GenerateContentOptions
): Promise<ZoekprofielContentResult> {
  const fileIds = await uploadZoekprofielDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No zoekprofiel files could be uploaded');
  }

  try {
    return await callZoekprofielModel(openai, fileIds, ctx, options);
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

function pickBetterFields(
  first: ZoekprofielFields,
  second: ZoekprofielFields
): ZoekprofielFields {
  const firstIssues = first.validationIssues?.length ?? 0;
  const secondIssues = second.validationIssues?.length ?? 0;
  if (secondIssues < firstIssues) return second;
  if (secondIssues === firstIssues && !second.validationIssues?.length) return second;
  return first;
}

export async function generateZoekprofiel(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: ZoekprofielBuildContext,
  docs: EmployeeDoc[]
): Promise<ZoekprofielFields> {
  const content = await generateZoekprofielContent(openai, supabase, ctx, docs);
  let fields = buildZoekprofielFields(ctx, content);

  if (fields.validationIssues?.length) {
    const retryHints = buildZoekprofielRetryMessage(
      formatValidationIssues(fields.validationIssues)
    );
    console.warn('⚠️ Zoekprofiel: validation failed, retrying once:', retryHints);

    try {
      const retryContent = await generateZoekprofielContent(openai, supabase, ctx, docs, {
        retryHints,
      });
      const retryFields = buildZoekprofielFields(ctx, retryContent);
      fields = pickBetterFields(fields, retryFields);
    } catch (retryError) {
      console.warn('⚠️ Zoekprofiel: retry failed, using first attempt', retryError);
    }
  }

  return fields;
}

export function buildZoekprofielContextFromMeta(
  fmlIzpLabDate?: string | null,
  options?: { hasBelastbaarheidsDoc?: boolean }
): ZoekprofielBuildContext {
  return {
    employee: {},
    meta: {
      fml_izp_lab_date_voluit: nlDate(fmlIzpLabDate) || null,
      has_belastbaarheids_doc: options?.hasBelastbaarheidsDoc ?? true,
    },
  };
}

export type { ZoekprofielBuildContext, ZoekprofielFields };
