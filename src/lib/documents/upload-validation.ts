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

/** Keep only characters Supabase Storage accepts in object keys. */
function sanitizeStorageSegment(part: string): string {
  return part
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sanitizeDocumentFileName(name: string): string | null {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }

  const lastDot = trimmed.lastIndexOf('.');
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const ext = lastDot > 0 ? trimmed.slice(lastDot + 1) : '';

  const safeBase = sanitizeStorageSegment(base) || 'file';
  const safeExt = sanitizeStorageSegment(ext);
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function buildDocumentStoragePath(
  employeeId: string,
  type: string,
  safeName: string
): string {
  return `${employeeId}/${type}-${safeName}`;
}
