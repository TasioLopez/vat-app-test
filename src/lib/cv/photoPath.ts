/**
 * Validates object path for bucket `cv-photos`: `{employeeId}/{cvId}/{filename}`.
 */
export function isValidCvPhotoStoragePath(employeeId: string, cvId: string, path: string): boolean {
  if (!path || path.includes('..') || path.includes('\\')) return false;
  const prefix = `${employeeId}/${cvId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  if (!rest || rest.includes('/')) return false;
  return true;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isAllowedCvPhotoMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export const CV_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
