import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import { generateIntakeSectie5Content } from '@/lib/tp/intake-sectie5';
import {
  buildBelastbaarheidsprofielFields,
  stripCitations,
  type BelastbaarheidsprofielBuildContext,
  type BelastbaarheidsprofielFields,
} from './build-fields';
import { DEFAULT_BELASTBAARHEID_MODEL } from './constants';
import { mergeBelastbaarheidsprofielContent } from './merge-content';
import {
  BELASTBAARHEID_CONTENT_PROMPT,
  buildBelastbaarheidsprofielContextMessage,
} from './prompt';
import {
  BELASTBAARHEID_CONTENT_JSON_SCHEMA,
  parseBelastbaarheidsprofielContentResult,
  type BelastbaarheidsprofielContentResult,
} from './schema';
import { extractSpreekuurContent } from './spreekuur-extract';
import type { SpreekuurContentResult } from './spreekuur-schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

const DOC_PRIORITY: Record<string, number> = {
  fml: 1,
  izp: 1,
  lab: 1,
  ad_rapportage: 2,
  ad_rapport: 2,
  ad: 2,
  intakeformulier: 3,
  'intake-formulier': 3,
  intake: 3,
};

type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

function docPriority(type: string | null | undefined): number {
  const t = (type || '').toLowerCase();
  if (isSpreekReportageDocType(t)) return 99;
  for (const [key, priority] of Object.entries(DOC_PRIORITY)) {
    if (t.includes(key)) return priority;
  }
  return 5;
}

function sortDocs(docs: EmployeeDoc[]): EmployeeDoc[] {
  return [...docs].sort((a, b) => docPriority(a.type) - docPriority(b.type));
}

function pickNewestSpreekuurDoc(docs: EmployeeDoc[]): EmployeeDoc | null {
  const spreekuurDocs = docs.filter((d) => isSpreekReportageDocType(d.type) && d.url);
  if (spreekuurDocs.length === 0) return null;
  return [...spreekuurDocs].sort((a, b) => {
    const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
    const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function getBelastbaarheidsprofielModel(): string {
  return process.env.OPENAI_BELASTBAARHEID_MODEL?.trim() || DEFAULT_BELASTBAARHEID_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_BELASTBAARHEID_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadPriorityDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[]
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of sortDocs(docs)) {
    if (!doc.url) continue;
    if (isSpreekReportageDocType(doc.type)) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Belastbaarheidsprofiel: skipping document (size limit)', path);
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

function buildApiContext(ctx: BelastbaarheidsprofielBuildContext): Record<string, unknown> {
  return {
    has_spreekuurrapportage: Boolean(ctx.has_spreekuurrapportage),
    meta: {
      fml_izp_lab_date: ctx.meta.fml_izp_lab_date,
      occupational_doctor_org: ctx.meta.occupational_doctor_org,
    },
  };
}

export async function generateBelastbaarheidsprofielContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: BelastbaarheidsprofielBuildContext,
  docs: EmployeeDoc[]
): Promise<BelastbaarheidsprofielContentResult> {
  const mainDocs = docs.filter((d) => !isSpreekReportageDocType(d.type));
  const fileIds = await uploadPriorityDocs(openai, supabase, mainDocs);

  if (fileIds.length === 0) {
    throw new Error('No files could be uploaded');
  }

  try {
    const contextMessage = buildBelastbaarheidsprofielContextMessage(buildApiContext(ctx));
    const userContent: OpenAI.Responses.ResponseInputContent[] = [
      { type: 'input_text', text: contextMessage },
      ...fileIds.map(
        (file_id): OpenAI.Responses.ResponseInputContent => ({
          type: 'input_file',
          file_id,
        })
      ),
    ];

    const reasoningEffort = getReasoningEffort();
    const response = await openai.responses.create({
      model: getBelastbaarheidsprofielModel(),
      instructions: BELASTBAARHEID_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'belastbaarheidsprofiel_content',
          strict: true,
          schema: BELASTBAARHEID_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return parseBelastbaarheidsprofielContentResult(parsed);
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generateBelastbaarheidsprofiel(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: BelastbaarheidsprofielBuildContext,
  docs: EmployeeDoc[]
): Promise<BelastbaarheidsprofielFields> {
  const spreekuurDoc = pickNewestSpreekuurDoc(docs);
  const hasSpreekuurDoc = Boolean(spreekuurDoc);

  const buildCtx: BelastbaarheidsprofielBuildContext = {
    ...ctx,
    has_spreekuurrapportage: hasSpreekuurDoc,
  };

  const spreekuurPromise = spreekuurDoc
    ? extractSpreekuurContent(openai, supabase, spreekuurDoc)
    : Promise.resolve(null as SpreekuurContentResult | null);

  const mainContentPromise = generateBelastbaarheidsprofielContent(
    openai,
    supabase,
    buildCtx,
    docs
  ).catch((error) => {
    if (!hasSpreekuurDoc) throw error;
    console.warn(
      '⚠️ Belastbaarheidsprofiel: geen FML/AD documenten — alleen Spreekuurrapportage beschikbaar'
    );
    return {
      rubrieken: [],
      prognose_citaat: null,
      spreekuur_meta: null,
    } satisfies BelastbaarheidsprofielContentResult;
  });

  const intakeSectie5Promise = generateIntakeSectie5Content(openai, supabase, docs).catch(
    (error) => {
      console.warn('⚠️ Belastbaarheidsprofiel: intake Sectie 5 extractie mislukt', error);
      return { quote_prognose_advies_belastbaarheid: null };
    }
  );

  const [spreekuurResult, mainContent, intakeSectie5] = await Promise.all([
    spreekuurPromise,
    mainContentPromise,
    intakeSectie5Promise,
  ]);

  const mergedContent = mergeBelastbaarheidsprofielContent(
    mainContent,
    spreekuurResult,
    hasSpreekuurDoc
  );

  mergedContent.prognose_citaat = intakeSectie5.quote_prognose_advies_belastbaarheid
    ? stripCitations(intakeSectie5.quote_prognose_advies_belastbaarheid)
    : null;

  return buildBelastbaarheidsprofielFields(buildCtx, mergedContent);
}

export type { BelastbaarheidsprofielBuildContext, BelastbaarheidsprofielFields };
