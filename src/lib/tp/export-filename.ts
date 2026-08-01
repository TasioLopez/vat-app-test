import { normalizePersonName } from '@/lib/utils';

const TP_DOC_PREFIX = 'Trajectplan tweede spoor begeleiding';
const VGR_DOC_PREFIX = 'Voortgangsrapportage';

function isFemale(gender?: string | null): boolean {
  return gender === 'Female' || gender === 'Vrouw' || gender?.toLowerCase() === 'vrouw';
}

function isMale(gender?: string | null): boolean {
  return gender === 'Male' || gender === 'Man' || gender?.toLowerCase() === 'man';
}

/** `de heer` / `mevrouw`, or null when gender is unknown. */
export function exportHonorific(gender?: string | null): string | null {
  if (isMale(gender)) return 'de heer';
  if (isFemale(gender)) return 'mevrouw';
  return null;
}

/**
 * Person label for export filenames: `de heer J. Doe (John)`.
 * Returns null when first or last name is missing.
 */
export function formatExportPersonLabel(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  gender?: string | null
): string | null {
  const first = normalizePersonName(firstName);
  const last = normalizePersonName(lastName);
  if (!first || !last) return null;

  const initial = first.charAt(0).toUpperCase();
  const person = `${initial}. ${last} (${first})`;
  const title = exportHonorific(gender);
  return title ? `${title} ${person}` : person;
}

function withPdfExtension(base: string): string {
  const trimmed = base.trim().replace(/\.pdf$/i, '');
  return `${trimmed}.pdf`;
}

export function buildTpDownloadFilename(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  gender?: string | null
): string {
  const person = formatExportPersonLabel(firstName, lastName, gender);
  return withPdfExtension(person ? `${TP_DOC_PREFIX} ${person}` : TP_DOC_PREFIX);
}

export function buildVgrDownloadFilename(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  gender?: string | null
): string {
  const person = formatExportPersonLabel(firstName, lastName, gender);
  return withPdfExtension(person ? `${VGR_DOC_PREFIX} ${person}` : VGR_DOC_PREFIX);
}

/**
 * Keep spaces, letters (incl. accents), digits, `.` `(` `)` `-`.
 * Strip path/control characters and other Windows-forbidden filename chars.
 */
export function sanitizeDownloadFilename(name: string): string {
  const raw = (name || '').trim() || 'document.pdf';
  const hasPdf = /\.pdf$/i.test(raw);
  const stem = hasPdf ? raw.slice(0, -4) : raw;

  const cleaned = stem
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const safeStem = cleaned || 'document';
  return `${safeStem}.pdf`;
}

/** Prefer profile values; fill gaps from snapshot fields. */
export function resolveExportNameParts(
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    gender?: string | null;
  } | null | undefined,
  snapshot?: Record<string, unknown> | null
): { first_name: string | null; last_name: string | null; gender: string | null } {
  const snapFirst =
    typeof snapshot?.first_name === 'string' ? snapshot.first_name : null;
  const snapLast =
    typeof snapshot?.last_name === 'string' ? snapshot.last_name : null;
  const snapGender =
    typeof snapshot?.gender === 'string' ? snapshot.gender : null;

  return {
    first_name: normalizePersonName(profile?.first_name) ?? normalizePersonName(snapFirst),
    last_name: normalizePersonName(profile?.last_name) ?? normalizePersonName(snapLast),
    gender: normalizePersonName(profile?.gender) ?? normalizePersonName(snapGender),
  };
}

/** Content-Disposition with ASCII fallback + RFC 5987 UTF-8 filename*. */
export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
