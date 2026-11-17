import type { CvDocumentPayload, CvModel } from '@/types/cv';

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

/** Clear poisoned photo paths; keep only paths owned by this employee/cv. */
function sanitizeModelPhotoPath(model: CvModel, employeeId: string, cvId: string): CvModel {
  const path = model.personal.photoStoragePath?.trim();
  if (!path) return model;
  if (isValidCvPhotoStoragePath(employeeId, cvId, path)) return model;
  return {
    ...model,
    personal: {
      ...model.personal,
      photoStoragePath: undefined,
      photoCrop: undefined,
    },
  };
}

/**
 * Strip any photoStoragePath that does not belong to `{employeeId}/{cvId}/…`
 * from NL and EN models (guest/share write path hardening).
 */
export function sanitizeCvPayloadPhotoPaths(
  payload: CvDocumentPayload,
  employeeId: string,
  cvId: string
): CvDocumentPayload {
  const nl = sanitizeModelPhotoPath(payload.content.nl, employeeId, cvId);
  const en = payload.content.en
    ? sanitizeModelPhotoPath(payload.content.en, employeeId, cvId)
    : undefined;
  return {
    ...payload,
    content: {
      nl,
      ...(en ? { en } : {}),
    },
  };
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isAllowedCvPhotoMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export const CV_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
