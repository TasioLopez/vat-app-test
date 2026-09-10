import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';
import type { BelastbaarheidsdocumentType } from './constants';

export type LeadingBelastbaarheidsDocInput = {
  type: string | null | undefined;
  /** ISO date string from document metadata or extracted document date, if known */
  documentDate?: string | null;
  /** Upload timestamp — never used as document date for leading resolution */
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

/**
 * Infer fml | izp | lab from a document type label.
 * Combined storage bucket `fml_izp` is ambiguous → null (never treat as IZP).
 */
export function inferBelastbaarheidsdocumentType(
  type: string | null | undefined
): BelastbaarheidsdocumentType | null {
  const t = (type || '').toLowerCase().trim();
  if (!t) return null;

  // Exact / reserved combined upload type — ambiguous FML vs IZP
  if (t === 'fml_izp' || t === 'fml/izp') {
    return null;
  }

  if (t === 'izp' || t.includes('inzetbaarheidsprofiel')) {
    return 'izp';
  }
  // Substring "izp" only when not part of the combined fml_izp bucket (already handled)
  if (t.includes('izp') && !t.includes('fml')) {
    return 'izp';
  }
  if (
    t === 'lab' ||
    t.includes('lab') ||
    t.includes('lijst arbeidsmogelijkheden')
  ) {
    return 'lab';
  }
  if (
    t === 'fml' ||
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

  // Upload timestamps must never count as document dates
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{4}-\d{2}-\d{2}\s/.test(trimmed)) {
    const iso = new Date(trimmed.slice(0, 10));
    if (!Number.isNaN(iso.getTime())) return iso;
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

  // Avoid parsing arbitrary strings that might be timestamps or junk
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(trimmed)) {
    const fallback = new Date(trimmed);
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }

  return null;
}

export function formatDatumVoluit(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeMetaKind(
  value: string | null | undefined
): BelastbaarheidsdocumentType | null {
  const t = String(value ?? '')
    .trim()
    .toLowerCase();
  if (t === 'fml' || t === 'izp' || t === 'lab' || t === 'belastbaarheidsprofiel') {
    return t;
  }
  return null;
}

/**
 * Resolve the leading belastbaarheidsdocument.
 * Priority: meta kind+date (intake) → real documentDate on uploads → model fields.
 * Never uses uploaded_at as document date.
 */
export function resolveLeadingBelastbaarheidsdoc(options: {
  docs: LeadingBelastbaarheidsDocInput[];
  metaDateIsoOrVoluit?: string | null;
  metaKind?: string | null;
  modelType?: BelastbaarheidsdocumentType | null;
  modelDatumVoluit?: string | null;
}): LeadingBelastbaarheidsDocResult | null {
  const { docs, metaDateIsoOrVoluit, metaKind, modelType, modelDatumVoluit } = options;

  const metaParsed = parseDutchOrIsoDate(metaDateIsoOrVoluit);
  const kindFromMeta = normalizeMetaKind(metaKind);

  // Authoritative: intake/gegevens kind + date
  if (kindFromMeta && metaParsed) {
    return {
      type: kindFromMeta,
      datumVoluit: formatDatumVoluit(metaParsed),
      isoDate: metaParsed.toISOString().slice(0, 10),
    };
  }

  type Candidate = {
    type: BelastbaarheidsdocumentType;
    date: Date | null;
    datumVoluit: string;
  };

  const candidates: Candidate[] = [];

  for (const doc of docs) {
    const type = inferBelastbaarheidsdocumentType(doc.type);
    if (!type) continue;
    // Only real document dates — never uploaded_at
    const parsed = parseDutchOrIsoDate(doc.documentDate);
    candidates.push({
      type,
      date: parsed,
      datumVoluit: parsed ? formatDatumVoluit(parsed) : '',
    });
  }

  if (candidates.length === 0) {
    if (kindFromMeta) {
      const modelParsed = parseDutchOrIsoDate(modelDatumVoluit);
      const date = metaParsed ?? modelParsed;
      return {
        type: kindFromMeta,
        datumVoluit: date
          ? formatDatumVoluit(date)
          : (modelDatumVoluit || metaDateIsoOrVoluit || '').trim(),
        isoDate: date ? date.toISOString().slice(0, 10) : null,
      };
    }
    if (modelType) {
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
    if (metaParsed) {
      // Date only from meta — type still unknown unless model provides it
      if (modelType) {
        return {
          type: modelType,
          datumVoluit: formatDatumVoluit(metaParsed),
          isoDate: metaParsed.toISOString().slice(0, 10),
        };
      }
      return null;
    }
    return null;
  }

  const dated = candidates.filter((c) => c.date != null);
  let winner: Candidate;
  if (dated.length > 0) {
    winner = dated.reduce((a, b) =>
      a.date!.getTime() >= b.date!.getTime() ? a : b
    );
  } else {
    winner =
      (modelType && candidates.find((c) => c.type === modelType)) ||
      (kindFromMeta && candidates.find((c) => c.type === kindFromMeta)) ||
      candidates[0];
  }

  const modelParsed = parseDutchOrIsoDate(modelDatumVoluit);

  let finalType = winner.type;
  if (kindFromMeta) {
    finalType = kindFromMeta;
  }

  let finalDate = winner.date;
  if (metaParsed) {
    finalDate = metaParsed;
  } else if (!finalDate && modelParsed) {
    finalDate = modelParsed;
  }

  if (
    modelType === finalType &&
    modelParsed &&
    finalDate &&
    modelParsed.getTime() > finalDate.getTime() &&
    !metaParsed
  ) {
    finalDate = modelParsed;
  }

  return {
    type: finalType,
    datumVoluit: finalDate
      ? formatDatumVoluit(finalDate)
      : (winner.datumVoluit || modelDatumVoluit || metaDateIsoOrVoluit || '').trim(),
    isoDate: finalDate ? finalDate.toISOString().slice(0, 10) : null,
  };
}
