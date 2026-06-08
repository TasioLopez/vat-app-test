import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  buildVisieWerknemerFields,
  type VisieWerknemerBuildContext,
  type VisieWerknemerFields,
} from './build-fields';
import { DEFAULT_VISIE_WERKNEMER_MODEL } from './constants';
import {
  VISIE_WERKNEMER_CONTENT_PROMPT,
  buildVisieWerknemerContextMessage,
} from './prompt';
import {
  VISIE_WERKNEMER_CONTENT_JSON_SCHEMA,
  parseVisieWerknemerContentResult,
  type VisieWerknemerContentResult,
} from './schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

function isIntakeDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return t.includes('intakeformulier') || t.includes('intake-formulier') || t.includes('intake');
}

function filterIntakeDocs(docs: EmployeeDoc[]): EmployeeDoc[] {
  return docs.filter((doc) => isIntakeDoc(doc.type));
}

function getVisieWerknemerModel(): string {
  return process.env.OPENAI_VISIE_WERKNEMER_MODEL?.trim() || DEFAULT_VISIE_WERKNEMER_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_VISIE_WERKNEMER_REASONING?.trim().toLowerCase();
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

  for (const doc of filterIntakeDocs(docs)) {
    if (!doc.url) continue;
    const path = extractStoragePath(doc.url);
    if (!path) continue;

    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    if (totalBytes + buffer.length > MAX_UPLOAD_BYTES) {
      console.warn('⚠️ Visie werknemer: skipping document (combined size limit)', path);
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

function buildApiContext(ctx: VisieWerknemerBuildContext): Record<string, unknown> {
  return {
    details: {
      gender: ctx.details.gender,
    },
  };
}

export async function generateVisieWerknemerContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieWerknemerBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieWerknemerContentResult> {
  const fileIds = await uploadIntakeDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No intake files could be uploaded');
  }

  try {
    const contextMessage = buildVisieWerknemerContextMessage(buildApiContext(ctx));
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
      model: getVisieWerknemerModel(),
      instructions: VISIE_WERKNEMER_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'visie_werknemer_content',
          strict: true,
          schema: VISIE_WERKNEMER_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return parseVisieWerknemerContentResult(parsed);
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generateVisieWerknemer(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: VisieWerknemerBuildContext,
  docs: EmployeeDoc[]
): Promise<VisieWerknemerFields> {
  const content = await generateVisieWerknemerContent(openai, supabase, ctx, docs);
  return buildVisieWerknemerFields(ctx, content);
}

export type { VisieWerknemerBuildContext, VisieWerknemerFields };
