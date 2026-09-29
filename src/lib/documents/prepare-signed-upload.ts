import {
  buildDocumentStoragePath,
  DOCUMENT_MAX_BYTES,
  resolveDocumentMime,
  sanitizeDocumentFileName,
} from '@/lib/documents/upload-validation';

export type PrepareSignedUploadInput = {
  employeeId: string;
  type: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
};

export type PrepareSignedUploadOk = { ok: true; path: string; contentType: string };
export type PrepareSignedUploadErr = { ok: false; error: string; status: 400 };
export type PrepareSignedUploadResult = PrepareSignedUploadOk | PrepareSignedUploadErr;

export function prepareEmployeeDocumentSignedUpload(
  input: PrepareSignedUploadInput
): PrepareSignedUploadResult {
  const employeeId = (input.employeeId || '').trim();
  const type = (input.type || '').trim();
  const originalName = (input.originalName || '').trim();
  const sizeBytes = input.sizeBytes;

  if (!employeeId || !type || !originalName) {
    return { ok: false, error: 'Missing fields', status: 400 };
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return { ok: false, error: 'Invalid file size', status: 400 };
  }

  if (sizeBytes > DOCUMENT_MAX_BYTES) {
    return { ok: false, error: 'File too large (max 10MB)', status: 400 };
  }

  const resolvedMime = resolveDocumentMime(input.contentType, originalName);
  if (!resolvedMime) {
    return { ok: false, error: 'Unsupported file type', status: 400 };
  }

  const safeName = sanitizeDocumentFileName(originalName);
  if (!safeName) {
    return { ok: false, error: 'Invalid file name', status: 400 };
  }

  const path = buildDocumentStoragePath(employeeId, type, safeName);
  return { ok: true, path, contentType: resolvedMime };
}
