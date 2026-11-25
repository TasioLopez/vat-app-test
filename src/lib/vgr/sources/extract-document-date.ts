import { parseDateFlexible, toISODate } from '@/lib/tp2026/trajectory-dates';

const ISO_IN_NAME = /(\d{4})[-_/](\d{1,2})[-_/](\d{1,2})/;
const DMY_IN_NAME = /(\d{1,2})[-_/](\d{1,2})[-_/](\d{4})/;
const DUTCH_LONG =
  /(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})/i;

/**
 * Pull a document date from filename or a short text snippet.
 * Never treats an upload timestamp (`…T…`) as a document date.
 */
export function extractDocumentDateFromText(input: string | null | undefined): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return null;

  const dutch = raw.match(DUTCH_LONG);
  if (dutch) {
    const parsed = parseDateFlexible(`${dutch[1]} ${dutch[2]} ${dutch[3]}`);
    if (parsed) return toISODate(parsed);
  }

  const iso = raw.match(ISO_IN_NAME);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const dmy = raw.match(DMY_IN_NAME);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const flexible = parseDateFlexible(raw.slice(0, 40));
  if (flexible && !/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return toISODate(flexible);
  }

  return null;
}

/** Prefer an explicit ISO date; otherwise scan filename then optional body text. */
export function resolveDocumentDate(params: {
  explicit?: string | null;
  filename?: string | null;
  textSnippet?: string | null;
}): string | null {
  const fromExplicit = extractDocumentDateFromText(params.explicit);
  if (fromExplicit) return fromExplicit;
  const fromName = extractDocumentDateFromText(params.filename);
  if (fromName) return fromName;
  return extractDocumentDateFromText(params.textSnippet);
}
