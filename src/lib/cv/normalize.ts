import type { CvModel, CvPhotoCrop } from '@/types/cv';
import { emptyCvModel } from '@/types/cv';

function normalizePhotoCrop(raw: unknown): CvPhotoCrop | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.width);
  const h = Number(o.height);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return undefined;
  if (w <= 0 || h <= 0) return undefined;
  const zoom = o.zoom !== undefined ? Number(o.zoom) : undefined;
  const crop: CvPhotoCrop = { x, y, width: w, height: h };
  if (zoom !== undefined && Number.isFinite(zoom) && zoom >= 1) {
    crop.zoom = zoom;
  }
  return crop;
}

/** Client/server safe normalization for JSON from DB */
export function normalizeCvPayload(raw: unknown): CvModel {
  if (!raw || typeof raw !== 'object') {
    return emptyCvModel();
  }
  const o = raw as Record<string, unknown>;
  const personalRaw =
    o.personal && typeof o.personal === 'object' ? (o.personal as Record<string, unknown>) : undefined;
  const personal = personalRaw as CvModel['personal'] | undefined;
  const optionsRaw = o.options && typeof o.options === 'object' ? (o.options as CvModel['options']) : undefined;
  const hasPhotoPath = Boolean(personal?.photoStoragePath?.trim());
  const includePhotoInCv =
    optionsRaw?.includePhotoInCv === false
      ? false
      : optionsRaw?.includePhotoInCv === true
        ? true
        : hasPhotoPath;

  const photoCrop = normalizePhotoCrop(personalRaw?.photoCrop);

  return {
    personal: {
      fullName: personal?.fullName ?? '',
      title: personal?.title ?? '',
      email: personal?.email ?? '',
      phone: personal?.phone ?? '',
      location: personal?.location ?? '',
      dateOfBirth: personal?.dateOfBirth,
      photoUrl: personal?.photoUrl,
      photoStoragePath: personal?.photoStoragePath,
      ...(photoCrop ? { photoCrop } : {}),
    },
    profile: typeof o.profile === 'string' ? o.profile : '',
    experience: Array.isArray(o.experience) ? (o.experience as CvModel['experience']) : [],
    education: Array.isArray(o.education) ? (o.education as CvModel['education']) : [],
    skills: Array.isArray(o.skills) ? (o.skills as CvModel['skills']) : [],
    languages: Array.isArray(o.languages) ? (o.languages as CvModel['languages']) : [],
    interests: Array.isArray(o.interests) ? (o.interests as CvModel['interests']) : [],
    extra: typeof o.extra === 'string' ? o.extra : '',
    options: {
      includePhotoInCv,
    },
  };
}
