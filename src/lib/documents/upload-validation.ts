export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export function isAllowedDocumentMime(mime: string): boolean {
  return ALLOWED_DOCUMENT_MIMES.has(mime);
}

export function sanitizeDocumentFileName(name: string): string | null {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }
  return trimmed.replace(/\s+/g, '-');
}

export function buildDocumentStoragePath(
  employeeId: string,
  type: string,
  safeName: string
): string {
  return `${employeeId}/${type}-${safeName}`;
}
