import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  buildAdAdviesFields,
  stripCitations,
  type AdAdviesBuildContext,
  type AdAdviesFields,
} from './build-fields';
import { DEFAULT_AD_ADVIES_MODEL } from './constants';
import { AD_ADVIES_CONTENT_PROMPT, buildAdAdviesContextMessage } from './prompt';
import {
  AD_ADVIES_CONTENT_JSON_SCHEMA,
  parseAdAdviesContentResult,
  type AdAdviesContentResult,
} from './schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

const AD_DOC_TYPES = ['ad_rapportage', 'ad_rapport', 'ad'];

type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

function isAdDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return AD_DOC_TYPES.some((key) => t.includes(key));
}

function getAdAdviesModel(): string {
  return process.env.OPENAI_AD_ADVIES_MODEL?.trim() || DEFAULT_AD_ADVIES_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_AD_ADVIES_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadAdDocs(
  openai: OpenAI,
  supabase: SupabaseClient,
  docs: EmployeeDoc[]
): Promise<string[]> {
  const fileIds: string[] = [];
  let totalBytes = 0;

  for (const doc of docs) {
    if (!doc.url || !isAdDoc(doc.type)) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ AD advies: skipping document (size limit)', path);
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

function buildApiContext(ctx: AdAdviesBuildContext): Record<string, unknown> {
  return {
    meta: {
      has_ad_report: ctx.meta.has_ad_report,
      ad_report_date: ctx.meta.ad_report_date,
    },
  };
}

export async function generateAdAdviesContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: AdAdviesBuildContext,
  docs: EmployeeDoc[]
): Promise<AdAdviesContentResult> {
  const fileIds = await uploadAdDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No AD report files could be uploaded');
  }

  try {
    const contextMessage = buildAdAdviesContextMessage(buildApiContext(ctx));
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
      model: getAdAdviesModel(),
      instructions: AD_ADVIES_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'ad_advies_content',
          strict: true,
          schema: AD_ADVIES_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    const content = parseAdAdviesContentResult(parsed);
    if (content.advies_citaat) {
      content.advies_citaat = stripCitations(content.advies_citaat);
    }
    return content;
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generateAdAdvies(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: AdAdviesBuildContext,
  docs: EmployeeDoc[]
): Promise<AdAdviesFields> {
  const content = await generateAdAdviesContent(openai, supabase, ctx, docs);
  return buildAdAdviesFields(ctx, content);
}

export type { AdAdviesBuildContext, AdAdviesFields };
