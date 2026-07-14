import type OpenAI from 'openai';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import {
  getDocumentExtractionModel,
  getDocumentExtractionReasoningEffort,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from './constants';

export type StructuredFileExtractionOptions<T> = {
  openai: OpenAI;
  buffer: Buffer;
  storagePath: string;
  fallbackName?: string;
  instructions: string;
  userMessage: string;
  schemaName: string;
  schema: Record<string, unknown>;
  parse: (raw: unknown) => T;
  model?: string;
};

export type DocumentTextExtractionOptions = {
  openai: OpenAI;
  buffer: Buffer;
  storagePath: string;
  fallbackName?: string;
  instructions: string;
  userMessage: string;
  model?: string;
};

async function uploadBufferForResponses(
  openai: OpenAI,
  buffer: Buffer,
  storagePath: string,
  fallbackName?: string
): Promise<string> {
  if (buffer.length > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new Error(`Document exceeds upload size limit (${MAX_DOCUMENT_UPLOAD_BYTES} bytes)`);
  }

  const uploadFile = buildOpenAIFile(buffer, storagePath, fallbackName);
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

export async function runStructuredFileExtraction<T>(
  options: StructuredFileExtractionOptions<T>
): Promise<T> {
  const {
    openai,
    buffer,
    storagePath,
    fallbackName,
    instructions,
    userMessage,
    schemaName,
    schema,
    parse,
    model = getDocumentExtractionModel(),
  } = options;

  let fileId: string | null = null;

  try {
    fileId = await uploadBufferForResponses(openai, buffer, storagePath, fallbackName);

    const userContent: OpenAI.Responses.ResponseInputContent[] = [
      { type: 'input_text', text: userMessage },
      { type: 'input_file', file_id: fileId },
    ];

    const reasoningEffort = getDocumentExtractionReasoningEffort();
    const response = await openai.responses.create({
      model,
      instructions,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(outputText) as unknown;
    return parse(parsed);
  } finally {
    await deleteUploadedFile(openai, fileId);
  }
}

export async function runDocumentTextExtraction(
  options: DocumentTextExtractionOptions
): Promise<string> {
  const {
    openai,
    buffer,
    storagePath,
    fallbackName,
    instructions,
    userMessage,
    model = getDocumentExtractionModel(),
  } = options;

  let fileId: string | null = null;

  try {
    fileId = await uploadBufferForResponses(openai, buffer, storagePath, fallbackName);

    const userContent: OpenAI.Responses.ResponseInputContent[] = [
      { type: 'input_text', text: userMessage },
      { type: 'input_file', file_id: fileId },
    ];

    const reasoningEffort = getDocumentExtractionReasoningEffort();
    const response = await openai.responses.create({
      model,
      instructions,
      input: [{ role: 'user', content: userContent }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    });

    return response.output_text?.trim() ?? '';
  } finally {
    await deleteUploadedFile(openai, fileId);
  }
}
