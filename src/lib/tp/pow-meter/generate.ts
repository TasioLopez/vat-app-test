import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  buildPowMeterFields,
  stripCitations,
  type PowMeterFields,
} from './build-fields';
import { DEFAULT_POW_METER_MODEL } from './constants';
import { POW_METER_CONTENT_PROMPT, buildPowMeterContextMessage } from './prompt';
import {
  POW_METER_CONTENT_JSON_SCHEMA,
  parsePowMeterContentResult,
  type PowMeterContentResult,
} from './schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

const INTAKE_DOC_VARIANTS = ['intakeformulier', 'intake-formulier', 'intake'];

type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

function isIntakeDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return INTAKE_DOC_VARIANTS.some((v) => t.includes(v));
}

function getPowMeterModel(): string {
  return process.env.OPENAI_POW_METER_MODEL?.trim() || DEFAULT_POW_METER_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_POW_METER_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadIntakeDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[]
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  const intakeDocs = docs.filter((d) => isIntakeDoc(d.type));

  for (const doc of intakeDocs) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ POW-meter: skipping document (size limit)', path);
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

export async function generatePowMeterContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  ctx: Record<string, unknown> = {}
): Promise<PowMeterContentResult> {
  const fileIds = await uploadIntakeDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No intake files could be uploaded');
  }

  try {
    const contextMessage = buildPowMeterContextMessage(ctx);
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
    const content = parsePowMeterContentResult(parsed);
    content.huidige_trede_tekst = stripCitations(content.huidige_trede_tekst);
    content.huidige_werkzame_uren = stripCitations(content.huidige_werkzame_uren);
    content.verwachting_3_maanden = stripCitations(content.verwachting_3_maanden);
    content.toelichting_pow = stripCitations(content.toelichting_pow);
    return content;
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generatePowMeter(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  ctx: Record<string, unknown> = {}
): Promise<PowMeterFields> {
  const content = await generatePowMeterContent(openai, supabase, docs, ctx);
  return buildPowMeterFields(content);
}

export type { PowMeterFields };
