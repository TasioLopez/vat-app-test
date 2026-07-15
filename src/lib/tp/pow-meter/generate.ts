import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import { buildPowMeterFields, nlDate, type PowMeterFields } from './build-fields';
import { DEFAULT_POW_METER_MODEL } from './constants';
import { POW_METER_CONTENT_PROMPT, buildPowMeterContextMessage } from './prompt';
import {
  POW_METER_CONTENT_JSON_SCHEMA,
  parsePowMeterContentResult,
  type PowMeterContentResult,
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

export type PowMeterBuildContext = {
  meta?: {
    prognose_bedrijfsarts?: string | null;
    fml_izp_lab_date_voluit?: string | null;
  };
};

export function getPowMeterDocCategory(type: string | null | undefined): DocCategory | null {
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

export function filterPowMeterDocs(
  docs: EmployeeDoc[],
  options?: { excludeAd?: boolean }
): EmployeeDoc[] {
  let filtered = docs
    .map((doc) => ({
      doc,
      category: getPowMeterDocCategory(doc.type),
    }))
    .filter((entry): entry is { doc: EmployeeDoc; category: DocCategory } => entry.category !== null)
    .sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category])
    .map((entry) => entry.doc);

  if (options?.excludeAd) {
    filtered = filtered.filter((doc) => getPowMeterDocCategory(doc.type) !== 'ad');
  }

  return filtered;
}

function getPowMeterModel(): string {
  return process.env.OPENAI_POW_METER_MODEL?.trim() || DEFAULT_POW_METER_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_POW_METER_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  // Default medium for ladder yes/no quality; set OPENAI_POW_METER_REASONING=off to disable.
  if (raw === 'off' || raw === 'none' || raw === 'false') return undefined;
  return 'medium';
}

async function uploadPowMeterDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  options?: { excludeAd?: boolean }
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of filterPowMeterDocs(docs, options)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ POW-meter: skipping document (combined size limit)', path);
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

function buildApiContext(ctx: PowMeterBuildContext): Record<string, unknown> {
  return {
    meta: {
      prognose_bedrijfsarts: ctx.meta?.prognose_bedrijfsarts || null,
      fml_izp_lab_date_voluit: ctx.meta?.fml_izp_lab_date_voluit || null,
    },
  };
}

export async function generatePowMeterContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  ctx: PowMeterBuildContext = {}
): Promise<PowMeterContentResult> {
  const fileIds = await uploadPowMeterDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No POW-meter files could be uploaded');
  }

  if (!ctx.meta?.prognose_bedrijfsarts?.trim() && !filterPowMeterDocs(docs).some((d) => getPowMeterDocCategory(d.type) === 'belastbaarheid')) {
    console.warn('⚠️ POW-meter: geen prognose_bedrijfsarts of belastbaarheidsdocument in context');
  }

  try {
    const contextMessage = buildPowMeterContextMessage(buildApiContext(ctx));
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
      model: getPowMeterModel(),
      instructions: POW_METER_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'pow_meter_content',
          strict: true,
          schema: POW_METER_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return parsePowMeterContentResult(parsed);
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generatePowMeter(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  ctx: PowMeterBuildContext = {}
): Promise<PowMeterFields> {
  const content = await generatePowMeterContent(openai, supabase, docs, ctx);
  return buildPowMeterFields(content);
}

export function buildPowMeterContextFromMeta(
  prognoseBedrijfsarts?: string | null,
  fmlIzpLabDate?: string | null
): PowMeterBuildContext {
  return {
    meta: {
      prognose_bedrijfsarts: prognoseBedrijfsarts || null,
      fml_izp_lab_date_voluit: nlDate(fmlIzpLabDate) || null,
    },
  };
}

export type { PowMeterFields };
