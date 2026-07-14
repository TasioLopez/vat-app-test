export type AdReportDateResult = { ad_report_date: string | null };
export type FmlIzpDateResult = { fml_izp_lab_date: string | null };

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
  },
  required: ['fml_izp_lab_date'],
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

export function parseFmlIzpDateResult(raw: unknown): FmlIzpDateResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const date = o.fml_izp_lab_date;
  if (date == null || (typeof date === 'string' && !date.trim())) {
    return { fml_izp_lab_date: null };
  }
  return { fml_izp_lab_date: String(date).trim() };
}
