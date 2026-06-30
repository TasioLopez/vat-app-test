import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  buildVisieLoopbaanadviseurFields,
  type VisieLoopbaanadviseurBuildContext,
  type VisieLoopbaanadviseurFields,
} from './build-fields';
import { type DocumentScenario } from './constants';
import { DEFAULT_VISIE_LOOPBAANADVISEUR_MODEL } from './constants';
import {
  VISIE_LOOPBAANADVISEUR_CONTENT_PROMPT,
  buildVisieLoopbaanadviseurContextMessage,
} from './prompt';
import {
  VISIE_LOOPBAANADVISEUR_CONTENT_JSON_SCHEMA,
  parseVisieLoopbaanadviseurContentResult,
  type VisieLoopbaanadviseurContentResult,
} from './schema';

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

export function getVisieLoopbaanadviseurDocCategory(
  type: string | null | undefined
): DocCategory | null {
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

export function filterVisieLoopbaanadviseurDocs(
  docs: EmployeeDoc[],
  options?: { excludeAd?: boolean }
): EmployeeDoc[] {
  let filtered = docs
    .map((doc) => ({
      doc,
      category: getVisieLoopbaanadviseurDocCategory(doc.type),
    }))
    .filter((entry): entry is { doc: EmployeeDoc; category: DocCategory } => entry.category !== null)
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category])
    .map((entry) => entry.doc);

  if (options?.excludeAd) {
    filtered = filtered.filter(
      (doc) => getVisieLoopbaanadviseurDocCategory(doc.type) !== 'ad'
    );
  }

  return filtered;
}

export function hasIntakeDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => getVisieLoopbaanadviseurDocCategory(d.type) === 'intake');
}

export function detectDocumentScenario(docs: EmployeeDoc[]): DocumentScenario {
  const categories = new Set(
    filterVisieLoopbaanadviseurDocs(docs)
      .map((d) => getVisieLoopbaanadviseurDocCategory(d.type))
      .filter((c): c is DocCategory => c != null)
  );

  if (categories.has('ad')) return 'ad';
  if (categories.has('belastbaarheid')) return 'belastbaarheid_only';
  return 'intake_only';
}

function getVisieLoopbaanadviseurModel(): string {
  return (
    process.env.OPENAI_VISIE_LOOPBAANADVISEUR_MODEL?.trim() ||
    DEFAULT_VISIE_LOOPBAANADVISEUR_MODEL
  );
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_VISIE_LOOPBAANADVISEUR_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadVisieLoopbaanadviseurDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  options?: { excludeAd?: boolean }
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of filterVisieLoopbaanadviseurDocs(docs, options)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Visie loopbaanadviseur: skipping document (combined size limit)', path);
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

function buildApiContext(ctx: VisieLoopbaanadviseurBuildContext): Record<string, unknown> {
  return {
    details: { gender: ctx.details.gender },
    meta: {
      fml_izp_lab_date: ctx.meta.fml_izp_lab_date,
      intake_date: ctx.meta.intake_date,
      occupational_doctor_org: ctx.meta.occupational_doctor_org,
      advies_ad_passende_arbeid: ctx.meta.advies_ad_passende_arbeid,
      zoekprofiel: ctx.meta.zoekprofiel || null,
      persoonlijk_profiel: ctx.meta.persoonlijk_profiel || null,
    },
  };
}

export async function generateVisieLoopbaanadviseurContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurContentResult> {
  if (!hasIntakeDoc(docs)) {
    throw new Error('No intake document found for visie loopbaanadviseur');
  }

  if (!ctx.meta.zoekprofiel?.trim()) {
    console.warn('⚠️ Visie loopbaanadviseur: zoekprofiel ontbreekt in context');
  }

  const fileIds = await uploadVisieLoopbaanadviseurDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No visie loopbaanadviseur files could be uploaded');
  }

  try {
    const contextMessage = buildVisieLoopbaanadviseurContextMessage(buildApiContext(ctx));
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
      model: getVisieLoopbaanadviseurModel(),
      instructions: VISIE_LOOPBAANADVISEUR_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'visie_loopbaanadviseur_content',
          strict: true,
          schema: VISIE_LOOPBAANADVISEUR_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return parseVisieLoopbaanadviseurContentResult(parsed);
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generateVisieLoopbaanadviseur(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurFields> {
  const scenario = detectDocumentScenario(docs);
  const content = await generateVisieLoopbaanadviseurContent(openai, supabase, ctx, docs);
  return buildVisieLoopbaanadviseurFields(ctx, content, scenario);
}

export type { VisieLoopbaanadviseurBuildContext, VisieLoopbaanadviseurFields };
