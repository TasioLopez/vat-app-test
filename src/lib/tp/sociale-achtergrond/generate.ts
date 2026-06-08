import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  buildSocialeAchtergrondFields,
  type SocialeAchtergrondBuildContext,
  type SocialeAchtergrondFields,
} from './build-fields';
import { DEFAULT_SOCIALE_ACHTERGROND_MODEL } from './constants';
import {
  SOCIALE_ACHTERGROND_CONTENT_PROMPT,
  buildSocialeAchtergrondContextMessage,
} from './prompt';
import {
  SOCIALE_ACHTERGROND_CONTENT_JSON_SCHEMA,
  parseSocialeAchtergrondContentResult,
  type SocialeAchtergrondContentResult,
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

function getSocialeAchtergrondModel(): string {
  return (
    process.env.OPENAI_SOCIALE_ACHTERGROND_MODEL?.trim() || DEFAULT_SOCIALE_ACHTERGROND_MODEL
  );
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_SOCIALE_ACHTERGROND_REASONING?.trim().toLowerCase();
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
      console.warn('⚠️ Sociale achtergrond: skipping document (combined size limit)', path);
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

function buildApiContext(ctx: SocialeAchtergrondBuildContext): Record<string, unknown> {
  return {
    employee: {
      first_name: ctx.employee.first_name,
    },
    details: {
      gender: ctx.details.gender,
    },
  };
}

export async function generateSocialeAchtergrondContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: SocialeAchtergrondBuildContext,
  docs: EmployeeDoc[]
): Promise<SocialeAchtergrondContentResult> {
  const fileIds = await uploadIntakeDocs(openai, supabase, docs);

  if (fileIds.length === 0) {
    throw new Error('No intake files could be uploaded');
  }

  try {
    const contextMessage = buildSocialeAchtergrondContextMessage(buildApiContext(ctx));
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
      model: getSocialeAchtergrondModel(),
      instructions: SOCIALE_ACHTERGROND_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'sociale_achtergrond_content',
          strict: true,
          schema: SOCIALE_ACHTERGROND_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return parseSocialeAchtergrondContentResult(parsed);
  } finally {
    await deleteUploadedFiles(openai, fileIds);
  }
}

export async function generateSocialeAchtergrond(
  openai: OpenAI,
  supabase: SupabaseClient,
  ctx: SocialeAchtergrondBuildContext,
  docs: EmployeeDoc[]
): Promise<SocialeAchtergrondFields> {
  const content = await generateSocialeAchtergrondContent(openai, supabase, ctx, docs);
  return buildSocialeAchtergrondFields(ctx, content);
}

export type { SocialeAchtergrondBuildContext, SocialeAchtergrondFields };
