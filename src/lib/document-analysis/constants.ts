export const DEFAULT_DOCUMENT_EXTRACTION_MODEL = 'gpt-5.1-2025-11-13';
export const MAX_DOCUMENT_UPLOAD_BYTES = 45 * 1024 * 1024;

export function getDocumentExtractionModel(): string {
  return process.env.OPENAI_DOCUMENT_EXTRACTION_MODEL?.trim() || DEFAULT_DOCUMENT_EXTRACTION_MODEL;
}

export function getDocumentExtractionReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_DOCUMENT_EXTRACTION_REASONING?.trim().toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return undefined;
}
