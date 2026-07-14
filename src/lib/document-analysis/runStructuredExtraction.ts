import type OpenAI from 'openai';
import { buildOpenAIFileFromPdf } from '@/lib/openai-file-upload';
import {
  getDocumentExtractionModel,
  getDocumentExtractionPdfDetail,
  getDocumentExtractionReasoningEffort,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_EXTRACTION_RETRIES,
} from './constants';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

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
  /** When true, set detail on input_file (vision PDF). */
  usePdfVision?: boolean;
  validate?: (result: T, context?: Record<string, unknown>) => ValidationResult;
  maxRetries?: number;
  /** Pre-normalized PDF upload (skips buildOpenAIFile). */
  pdfBuffer?: Buffer;
  analysisFilename?: string;
};

export type StructuredExtractionPass<T> = {
  instructions: string;
  userMessage: string;
  schemaName: string;
  schema: Record<string, unknown>;
  parse: (raw: unknown) => T;
  validate?: (result: T, context: Record<string, unknown>) => ValidationResult;
  logLabel?: string;
};

export type MultiPassExtractionOptions = {
  openai: OpenAI;
  pdfBuffer: Buffer;
  analysisFilename: string;
  passes: StructuredExtractionPass<Record<string, unknown>>[];
  model?: string;
  maxRetries?: number;
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

async function uploadPdfForResponses(
  openai: OpenAI,
  pdfBuffer: Buffer,
  analysisFilename: string
): Promise<string> {
  if (pdfBuffer.length > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new Error(`Document exceeds upload size limit (${MAX_DOCUMENT_UPLOAD_BYTES} bytes)`);
  }

  const uploadFile = buildOpenAIFileFromPdf(pdfBuffer, analysisFilename);
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

function buildCorrectionMessage(errors: string[]): string {
  return [
    'Previous extraction failed validation. Fix ONLY these issues:',
    ...errors.map((e) => `- ${e}`),
    'Return corrected JSON matching the schema.',
  ].join('\n');
}

/** PDF detail is supported by the Responses API; SDK types may lag behind. */
function buildPdfInputFileContent(
  fileId: string,
  usePdfVision: boolean
): OpenAI.Responses.ResponseInputContent {
  const base = { type: 'input_file' as const, file_id: fileId };
  if (!usePdfVision) return base;

  const pdfDetail = getDocumentExtractionPdfDetail();
  if (pdfDetail === 'auto') return base;

  return { ...base, detail: pdfDetail } as OpenAI.Responses.ResponseInputContent;
}

async function callStructuredExtraction<T>(
  openai: OpenAI,
  options: {
    fileId: string;
    instructions: string;
    userMessage: string;
    schemaName: string;
    schema: Record<string, unknown>;
    model: string;
    usePdfVision: boolean;
  }
): Promise<unknown> {
  const inputFile = buildPdfInputFileContent(options.fileId, options.usePdfVision);

  const userContent: OpenAI.Responses.ResponseInputContent[] = [
    { type: 'input_text', text: options.userMessage },
    inputFile,
  ];

  const reasoningEffort = getDocumentExtractionReasoningEffort();
  const response = await openai.responses.create({
    model: options.model,
    instructions: options.instructions,
    input: [{ role: 'user', content: userContent }],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    text: {
      format: {
        type: 'json_schema',
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error('Empty response from model');
  }

  return JSON.parse(outputText) as unknown;
}

async function runPassWithValidation<T>(
  openai: OpenAI,
  fileId: string,
  pass: {
    instructions: string;
    userMessage: string;
    schemaName: string;
    schema: Record<string, unknown>;
    parse: (raw: unknown) => T;
    validate?: (result: T, context: Record<string, unknown>) => ValidationResult;
    logLabel?: string;
  },
  model: string,
  usePdfVision: boolean,
  maxRetries: number,
  context: Record<string, unknown>
): Promise<T> {
  let lastErrors: string[] = [];
  let userMessage = pass.userMessage;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const raw = await callStructuredExtraction(openai, {
      fileId,
      instructions: pass.instructions,
      userMessage,
      schemaName: pass.schemaName,
      schema: pass.schema,
      model,
      usePdfVision,
    });

    const parsed = pass.parse(raw);
    if (!pass.validate) {
      if (pass.logLabel) {
        console.log(`✅ ${pass.logLabel} (attempt ${attempt + 1})`);
      }
      return parsed;
    }

    const validation = pass.validate ? pass.validate(parsed, context) : { ok: true, errors: [] };
    if (validation.ok) {
      if (pass.logLabel) {
        console.log(`✅ ${pass.logLabel} (attempt ${attempt + 1})`);
      }
      return parsed;
    }

    lastErrors = validation.errors;
    if (attempt < maxRetries) {
      console.log(
        `⚠️ ${pass.logLabel ?? pass.schemaName} validation failed (attempt ${attempt + 1}): ${lastErrors.join('; ')}`
      );
      userMessage = `${pass.userMessage}\n\n${buildCorrectionMessage(lastErrors)}`;
      continue;
    }

    console.log(
      `⚠️ ${pass.logLabel ?? pass.schemaName} returning best effort after ${maxRetries + 1} attempts: ${lastErrors.join('; ')}`
    );
    return parsed;
  }

  throw new Error('Extraction pass failed unexpectedly');
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
    usePdfVision = false,
    validate,
    maxRetries = MAX_EXTRACTION_RETRIES,
    pdfBuffer,
    analysisFilename,
  } = options;

  let fileId: string | null = null;

  try {
    if (pdfBuffer && analysisFilename) {
      fileId = await uploadPdfForResponses(openai, pdfBuffer, analysisFilename);
    } else {
      const { buildOpenAIFile } = await import('@/lib/openai-file-upload');
      const uploadFile = buildOpenAIFile(buffer, storagePath, fallbackName);
      if (uploadFile.size > MAX_DOCUMENT_UPLOAD_BYTES) {
        throw new Error(`Document exceeds upload size limit (${MAX_DOCUMENT_UPLOAD_BYTES} bytes)`);
      }
      const uploaded = await openai.files.create({
        file: uploadFile,
        purpose: 'assistants',
      });
      fileId = uploaded.id;
    }

    return runPassWithValidation(
      openai,
      fileId,
      {
        instructions,
        userMessage,
        schemaName,
        schema,
        parse,
        validate: validate
          ? (result, context) => validate(result, context)
          : undefined,
      },
      model,
      usePdfVision,
      maxRetries,
      {}
    );
  } finally {
    await deleteUploadedFile(openai, fileId);
  }
}

export async function runMultiPassExtraction(
  options: MultiPassExtractionOptions
): Promise<Record<string, unknown>> {
  const {
    openai,
    pdfBuffer,
    analysisFilename,
    passes,
    model = getDocumentExtractionModel(),
    maxRetries = MAX_EXTRACTION_RETRIES,
  } = options;

  let fileId: string | null = null;
  const merged: Record<string, unknown> = {};

  try {
    fileId = await uploadPdfForResponses(openai, pdfBuffer, analysisFilename);

    for (const pass of passes) {
      const result = await runPassWithValidation(
        openai,
        fileId,
        pass,
        model,
        true,
        maxRetries,
        merged
      );
      Object.assign(merged, result);
    }

    return merged;
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
    const { buildOpenAIFile } = await import('@/lib/openai-file-upload');
    const uploadFile = buildOpenAIFile(buffer, storagePath, fallbackName);
    const uploaded = await openai.files.create({
      file: uploadFile,
      purpose: 'assistants',
    });
    fileId = uploaded.id;

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
