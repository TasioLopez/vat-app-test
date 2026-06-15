import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  generateIntakeSectie7Content,
  hasIntakeFunctieCategories,
  type EmployeeDoc,
} from '@/lib/tp/intake-sectie7';
import {
  buildVisieLoopbaanadviseurContentFromIntake,
  buildVisieLoopbaanadviseurFields,
  type VisieLoopbaanadviseurBuildContext,
  type VisieLoopbaanadviseurFields,
} from './build-fields';
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

const DOC_PRIORITY: Record<string, number> = {
  intakeformulier: 1,
  'intake-formulier': 1,
  intake: 1,
  fml: 2,
  izp: 2,
  lab: 2,
  ad_rapportage: 3,
  ad_rapport: 3,
  ad: 3,
};

function docPriority(type: string | null | undefined): number {
  const t = (type || '').toLowerCase();
  for (const [key, priority] of Object.entries(DOC_PRIORITY)) {
    if (t.includes(key)) return priority;
  }
  return 5;
}

function sortDocs(docs: EmployeeDoc[]): EmployeeDoc[] {
  return [...docs].sort((a, b) => docPriority(a.type) - docPriority(b.type));
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

async function uploadPriorityDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[]
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of sortDocs(docs)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Visie loopbaanadviseur: skipping document (size limit)', path);
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
    },
  };
}

async function generateVisieLoopbaanadviseurContentFallback(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurContentResult> {
  const fileIds = await uploadPriorityDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No files could be uploaded');
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

export async function generateVisieLoopbaanadviseurContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurContentResult> {
  try {
    const intake = await generateIntakeSectie7Content(openai, supabase, docs, {
      meta: {
        ad_report_date: ctx.meta.fml_izp_lab_date,
        has_ad_report: Boolean(ctx.meta.advies_ad_passende_arbeid),
      },
    });

    if (hasIntakeFunctieCategories(intake)) {
      return buildVisieLoopbaanadviseurContentFromIntake(intake.functie_categorien);
    }
  } catch (error) {
    console.warn('⚠️ Visie loopbaanadviseur: intake Sectie 7 extraction failed, using fallback', error);
  }

  return generateVisieLoopbaanadviseurContentFallback(openai, supabase, ctx, docs);
}

export async function generateVisieLoopbaanadviseur(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieLoopbaanadviseurBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieLoopbaanadviseurFields> {
  const content = await generateVisieLoopbaanadviseurContent(openai, supabase, ctx, docs);
  return buildVisieLoopbaanadviseurFields(ctx, content);
}

export type { VisieLoopbaanadviseurBuildContext, VisieLoopbaanadviseurFields, EmployeeDoc };
