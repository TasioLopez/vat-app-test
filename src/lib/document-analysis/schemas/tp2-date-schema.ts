export type AdReportDateResult = { ad_report_date: string | null };
export type FmlIzpLabKind = 'fml' | 'izp' | 'lab';
export type FmlIzpDateResult = {
  fml_izp_lab_date: string | null;
  fml_izp_lab_kind: FmlIzpLabKind | null;
};

function nullableDateString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

export const AD_REPORT_DATE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ad_report_date: nullableDateString('Datum AD-rapport YYYY-MM-DD'),
  },
  required: ['ad_report_date'],
  additionalProperties: false,
} as const;

export const FML_IZP_DATE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    fml_izp_lab_date: nullableDateString('Datum FML/IZP YYYY-MM-DD'),
    fml_izp_lab_kind: {
      type: ['string', 'null'] as const,
      enum: ['fml', 'izp', 'lab', null],
      description: 'Document kind from title/content: fml, izp, or lab',
    },
  },
  required: ['fml_izp_lab_date', 'fml_izp_lab_kind'],
  additionalProperties: false,
} as const;

export function parseAdReportDateResult(raw: unknown): AdReportDateResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const date = o.ad_report_date;
  if (date == null || (typeof date === 'string' && !date.trim())) {
    return { ad_report_date: null };
  }
  return { ad_report_date: String(date).trim() };
}

export function normalizeFmlIzpLabKind(value: unknown): FmlIzpLabKind | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'fml' || raw === 'izp' || raw === 'lab') return raw;
  return null;
}

export function parseFmlIzpDateResult(raw: unknown): FmlIzpDateResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const date = o.fml_izp_lab_date;
  const kind = normalizeFmlIzpLabKind(o.fml_izp_lab_kind);
  return {
    fml_izp_lab_date:
      date == null || (typeof date === 'string' && !date.trim())
        ? null
        : String(date).trim(),
    fml_izp_lab_kind: kind,
  };
}
