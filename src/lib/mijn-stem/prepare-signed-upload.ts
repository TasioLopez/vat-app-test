export const MIJN_STEM_MAX_BYTES = 10 * 1024 * 1024;

export const MIJN_STEM_ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

export function resolveMijnStemMime(
  contentType: string | null | undefined,
  fileName: string
): string | null {
  const mime = (contentType || '').trim().toLowerCase();
  if (mime && mime !== 'application/octet-stream' && MIJN_STEM_ALLOWED_MIMES.has(mime)) {
    return mime;
  }
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot < 0) return mime && MIJN_STEM_ALLOWED_MIMES.has(mime) ? mime : null;
  const ext = fileName.slice(lastDot + 1).toLowerCase();
  return EXT_TO_MIME[ext] ?? null;
}

export function sanitizeMijnStemFileName(name: string): string {
  return (name || '').replace(/\s+/g, '-').replace(/[^\w.\-]+/g, '-') || 'file';
}

export type PrepareMijnStemSignedUploadInput = {
  userId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  /** Optional timestamp for stable tests; defaults to Date.now() */
  timestamp?: number;
};

export type PrepareMijnStemSignedUploadOk = {
  ok: true;
  path: string;
  contentType: string;
};
export type PrepareMijnStemSignedUploadErr = { ok: false; error: string; status: 400 };
export type PrepareMijnStemSignedUploadResult =
  | PrepareMijnStemSignedUploadOk
  | PrepareMijnStemSignedUploadErr;

export function prepareMijnStemSignedUpload(
  input: PrepareMijnStemSignedUploadInput
): PrepareMijnStemSignedUploadResult {
  const userId = (input.userId || '').trim();
  const originalName = (input.originalName || '').trim();
  const sizeBytes = input.sizeBytes;

  if (!userId || !originalName) {
    return { ok: false, error: 'Missing fields', status: 400 };
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return { ok: false, error: 'Invalid file size', status: 400 };
  }

  if (sizeBytes > MIJN_STEM_MAX_BYTES) {
    return { ok: false, error: 'File too large (max 10MB)', status: 400 };
  }

  const resolvedMime = resolveMijnStemMime(input.contentType, originalName);
  if (!resolvedMime) {
    return { ok: false, error: 'Unsupported file type', status: 400 };
  }

  const safeName = sanitizeMijnStemFileName(originalName);
  const timestamp = input.timestamp ?? Date.now();
  const path = `${userId}/mijn-stem-${timestamp}-${safeName}`;

  return { ok: true, path, contentType: resolvedMime };
}

/** True when path is a Mijn Stem object owned by this user. */
export function isOwnedMijnStemStoragePath(userId: string, storagePath: string): boolean {
  const normalized = (storagePath || '').trim().replace(/^\/+/, '');
  const prefix = `${userId}/mijn-stem-`;
  return normalized.startsWith(prefix) && !normalized.includes('..');
}
