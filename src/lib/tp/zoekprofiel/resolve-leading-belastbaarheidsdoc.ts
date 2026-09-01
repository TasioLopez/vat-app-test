import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';
import type { BelastbaarheidsdocumentType } from './constants';

export type LeadingBelastbaarheidsDocInput = {
  type: string | null | undefined;
  /** ISO date string from document metadata or extracted document date, if known */
  documentDate?: string | null;
  uploaded_at?: string | null;
};

export type LeadingBelastbaarheidsDocResult = {
  type: BelastbaarheidsdocumentType;
  datumVoluit: string;
  /** ISO date used for comparison, if available */
  isoDate: string | null;
};

const NL_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maart: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  augustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  december: 11,
};

/** Infer fml | izp | lab from a document type label. */
export function inferBelastbaarheidsdocumentType(
  type: string | null | undefined
): BelastbaarheidsdocumentType | null {
  const t = (type || '').toLowerCase();
  if (!t) return null;
  if (
    t.includes('izp') ||
    t.includes('inzetbaarheidsprofiel')
  ) {
    return 'izp';
  }
  if (
    t.includes('lab') ||
    t.includes('lijst arbeidsmogelijkheden')
  ) {
    return 'lab';
  }
  if (
    t.includes('fml') ||
    t.includes('functiemogelijkhedenlijst') ||
    t.includes('functionele mogelijkheden')
  ) {
    return 'fml';
  }
  if (
    isSpreekReportageDocType(type) ||
    t.includes('belastbaarheidsprofiel')
  ) {
    return 'belastbaarheidsprofiel';
  }
  return null;
}

/** Parse a Dutch long date ("19 januari 2026") or ISO date into a Date, or null. */
export function parseDutchOrIsoDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return iso;
  }

  const match = trimmed.match(/^(\d{1,2})\s+([a-zA-Zäöüé]+)\s+(\d{4})$/i);
  if (match) {
    const day = Number(match[1]);
    const month = NL_MONTHS[match[2].toLowerCase()];
    const year = Number(match[3]);
    if (month != null && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) return fallback;
  return null;
}

export function formatDatumVoluit(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function pickBestDate(
  candidates: Array<string | null | undefined>
): { date: Date; source: string } | null {
  let best: { date: Date; source: string } | null = null;
  for (const candidate of candidates) {
    const parsed = parseDutchOrIsoDate(candidate);
    if (!parsed) continue;
    if (!best || parsed.getTime() > best.date.getTime()) {
      best = { date: parsed, source: candidate!.trim() };
    }
  }
  return best;
}

/**
 * Resolve the leading belastbaarheidsdocument by document date (not upload order).
 * Prefers explicit documentDate, then meta date, then uploaded_at as last resort.
 */
export function resolveLeadingBelastbaarheidsdoc(options: {
  docs: LeadingBelastbaarheidsDocInput[];
  metaDateIsoOrVoluit?: string | null;
  modelType?: BelastbaarheidsdocumentType | null;
  modelDatumVoluit?: string | null;
}): LeadingBelastbaarheidsDocResult | null {
  const { docs, metaDateIsoOrVoluit, modelType, modelDatumVoluit } = options;

  type Candidate = {
    type: BelastbaarheidsdocumentType;
    date: Date | null;
    datumVoluit: string;
  };

  const candidates: Candidate[] = [];

  for (const doc of docs) {
    const type = inferBelastbaarheidsdocumentType(doc.type);
    if (!type) continue;
    const best = pickBestDate([doc.documentDate, doc.uploaded_at]);
    candidates.push({
      type,
      date: best?.date ?? null,
      datumVoluit: best ? formatDatumVoluit(best.date) : '',
    });
  }

  if (candidates.length === 0) {
    // Fall back to meta + model when no typed docs are available
    if (modelType) {
      const metaParsed = parseDutchOrIsoDate(metaDateIsoOrVoluit);
      const modelParsed = parseDutchOrIsoDate(modelDatumVoluit);
      const date = metaParsed ?? modelParsed;
      return {
        type: modelType,
        datumVoluit: date
          ? formatDatumVoluit(date)
          : (modelDatumVoluit || metaDateIsoOrVoluit || '').trim(),
        isoDate: date ? date.toISOString().slice(0, 10) : null,
      };
    }
    return null;
  }

  // Prefer candidate with the newest known date
  const dated = candidates.filter((c) => c.date != null);
  let winner: Candidate;
  if (dated.length > 0) {
    winner = dated.reduce((a, b) =>
      (a.date!.getTime() >= b.date!.getTime() ? a : b)
    );
  } else {
    // No dates: prefer model type if it matches a candidate, else first
    winner =
      (modelType && candidates.find((c) => c.type === modelType)) ||
      candidates[0];
  }

  // Prefer meta date for datumVoluit when it matches the winning type / is newer
  const metaParsed = parseDutchOrIsoDate(metaDateIsoOrVoluit);
  const modelParsed = parseDutchOrIsoDate(modelDatumVoluit);

  let finalDate = winner.date;
  if (metaParsed && (!finalDate || metaParsed.getTime() >= finalDate.getTime())) {
    // Use meta date when available and not older than winner
    if (!finalDate || metaParsed.getTime() === finalDate.getTime() || !winner.date) {
      finalDate = metaParsed;
    }
  }
  if (!finalDate && modelParsed) {
    finalDate = modelParsed;
  }

  // If model returns a newer date for the same type, prefer that for display
  if (
    modelType === winner.type &&
    modelParsed &&
    finalDate &&
    modelParsed.getTime() > finalDate.getTime()
  ) {
    finalDate = modelParsed;
  }

  return {
    type: winner.type,
    datumVoluit: finalDate
      ? formatDatumVoluit(finalDate)
      : (winner.datumVoluit || modelDatumVoluit || metaDateIsoOrVoluit || '').trim(),
    isoDate: finalDate ? finalDate.toISOString().slice(0, 10) : null,
  };
}
