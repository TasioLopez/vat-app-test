export const DEFAULT_DOCUMENT_EXTRACTION_MODEL = 'gpt-5.1-2025-11-13';
export const MAX_DOCUMENT_UPLOAD_BYTES = 45 * 1024 * 1024;
export const MAX_EXTRACTION_RETRIES = 2;

export type PdfDetailLevel = 'low' | 'high' | 'auto';

export function getDocumentExtractionModel(): string {
  return process.env.OPENAI_DOCUMENT_EXTRACTION_MODEL?.trim() || DEFAULT_DOCUMENT_EXTRACTION_MODEL;
}

export function getDocumentExtractionReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OPENAI_DOCUMENT_EXTRACTION_REASONING?.trim().toLowerCase();
  if (raw === 'off' || raw === 'none' || raw === 'false') return undefined;
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  // Default medium: checkbox / form vision needs reasoning; override via env if needed.
  return 'medium';
}

export function getDocumentExtractionPdfDetail(): PdfDetailLevel {
  const raw = process.env.OPENAI_DOCUMENT_EXTRACTION_PDF_DETAIL?.trim().toLowerCase();
  if (raw === 'low' || raw === 'high' || raw === 'auto') return raw;
  return 'high';
}
