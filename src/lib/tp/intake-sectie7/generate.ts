import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import { sanitizeIntakeSectie7Content } from './build-fields';
import { DEFAULT_INTAKE_SECTIE7_MODEL, INTAKE_DOC_VARIANTS } from './constants';
import {
  INTAKE_SECTIE7_CONTENT_PROMPT,
  buildIntakeSectie7ContextMessage,
} from './prompt';
import {
  INTAKE_SECTIE7_JSON_SCHEMA,
  parseIntakeSectie7Content,
  type IntakeSectie7Content,
} from './schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

export type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

export type IntakeSectie7Context = {
  meta?: {
    ad_report_date?: string | null;
    occupational_doctor_name?: string | null;
    has_ad_report?: boolean | null;
    ad_report_concept?: boolean | null;
  };
};

function isIntakeDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return INTAKE_DOC_VARIANTS.some((v) => t.includes(v));
}

function getIntakeSectie7Model(): string {
  return process.env.OPENAI_INTAKE_SECTIE7_MODEL?.trim() || DEFAULT_INTAKE_SECTIE7_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_INTAKE_SECTIE7_REASONING?.trim().toLowerCase();
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

  for (const doc of docs.filter((d) => isIntakeDoc(d.type))) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Intake sectie 7: skipping document (size limit)', path);
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

function buildApiContext(ctx: IntakeSectie7Context): Record<string, unknown> {
  return {
    meta: {
      ad_report_date: ctx.meta?.ad_report_date,
      occupational_doctor_name: ctx.meta?.occupational_doctor_name,
      has_ad_report: ctx.meta?.has_ad_report,
      ad_report_concept: ctx.meta?.ad_report_concept,
    },
  };
}

export async function generateIntakeSectie7Content(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[],
  ctx: IntakeSectie7Context = {}
): Promise<IntakeSectie7Content> {
  const fileIds = await uploadIntakeDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No intake files could be uploaded');
  }

  try {
    const contextMessage = buildIntakeSectie7ContextMessage(buildApiContext(ctx));
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
      model: getIntakeSectie7Model(),
      instructions: INTAKE_SECTIE7_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'intake_sectie7_content',
          strict: true,
          schema: INTAKE_SECTIE7_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return sanitizeIntakeSectie7Content(parseIntakeSectie7Content(parsed));
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}
