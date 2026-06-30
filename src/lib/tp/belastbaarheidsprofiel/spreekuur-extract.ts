import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import { DEFAULT_BELASTBAARHEID_MODEL } from './constants';
import { stripCitations } from './build-fields';
import {
  SPREEKUUR_CONTENT_PROMPT,
  buildSpreekuurContextMessage,
} from './spreekuur-prompt';
import {
  SPREEKUUR_CONTENT_JSON_SCHEMA,
  parseSpreekuurContentResult,
  type SpreekuurContentResult,
} from './spreekuur-schema';

const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

function getSpreekuurModel(): string {
  return process.env.OPENAI_BELASTBAARHEID_MODEL?.trim() || DEFAULT_BELASTBAARHEID_MODEL;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_BELASTBAARHEID_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}

async function uploadSpreekuurDoc(
  openai: OpenAI,
  supabase: SupabaseClient,
  doc: EmployeeDoc
): Promise<string | null> {
  if (!doc.url) return null;
  const path = extractStoragePath(doc.url);
  if (!path) return null;

  const { data: file } = await supabase.storage.from('documents').download(path);
  if (!file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES) {
    console.warn('⚠️ Spreekuurrapportage: document too large', path);
    return null;
  }

  const uploadFile = buildOpenAIFile(buffer, path);
  const uploaded = await openai.files.create({
    file: uploadFile,
    purpose: 'assistants',
  });
  return uploaded.id;
}

async function deleteUploadedFile(openai: OpenAI, fileId: string | null): Promise<void> {
  if (!fileId) return;
  await openai.files.delete(fileId).catch(() => {});
}

export async function extractSpreekuurContent(
  openai: OpenAI,
  supabase: SupabaseClient,
  doc: EmployeeDoc
): Promise<SpreekuurContentResult | null> {
  const fileId = await uploadSpreekuurDoc(openai, supabase, doc);
  if (!fileId) return null;

  try {
    const contextMessage = buildSpreekuurContextMessage();
    const userContent: OpenAI.Responses.ResponseInputContent[] = [
      { type: 'input_text', text: contextMessage },
      { type: 'input_file', file_id: fileId },
    ];

    const reasoningEffort = getReasoningEffort();
    const response = await openai.responses.create({
      model: getSpreekuurModel(),
      instructions: SPREEKUUR_CONTENT_PROMPT,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: 'spreekuurrapportage_content',
          strict: true,
          schema: SPREEKUUR_CONTENT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      console.warn('⚠️ Spreekuurrapportage: empty model response');
      return null;
    }

    const parsed = JSON.parse(outputText) as unknown;
    const content = parseSpreekuurContentResult(parsed);
    if (content.prognose_citaat) {
      content.prognose_citaat = stripCitations(content.prognose_citaat);
    }
    return content;
  } catch (error) {
    console.error('❌ Spreekuurrapportage extraction failed:', error);
    return null;
  } finally {
    await deleteUploadedFile(openai, fileId);
  }
}
