/** Helpers for AD report presence on TP step 2 (not related to concept wording). */

export function isAdDocumentType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return t.includes('ad');
}

export function docsIncludeAdReport(docs: { type?: string | null }[]): boolean {
  return docs.some((doc) => isAdDocumentType(doc.type));
}

export function hasFilledAdReportDate(adDate: unknown): boolean {
  if (adDate == null || adDate === '') return false;
  if (typeof adDate === 'string') return adDate.trim() !== '';
  return true;
}

/** Apply AD presence rules to TP2 autofill extraction (mutates extracted). */
export function resolveTp2HasAdReport(
  extracted: Record<string, unknown>,
  hasAdDocument: boolean
): void {
  const hasAdDate = hasFilledAdReportDate(extracted.ad_report_date);

  if (hasAdDocument || hasAdDate) {
    extracted.has_ad_report = true;
  } else if (extracted.has_ad_report !== true && extracted.has_ad_report !== false) {
    extracted.has_ad_report = false;
  }

  if (extracted.ad_report_concept === true) {
    extracted.has_ad_report = false;
  }
}

/**
 * Coerce null/undefined has_ad_report for drafts that never ran TP2 autofill.
 * Infers Ja from a filled AD date; concept always forces Nee.
 */
export function coerceHasAdReportForShape(data: {
  has_ad_report?: boolean | null;
  ad_report_date?: unknown;
  ad_report_concept?: boolean | null;
}): boolean {
  if (data.ad_report_concept === true) return false;
  if (data.has_ad_report === true) return true;
  if (data.has_ad_report === false) {
    // Date filled after an explicit Nee (e.g. editor sync pending) → Ja
    return hasFilledAdReportDate(data.ad_report_date);
  }
  return hasFilledAdReportDate(data.ad_report_date);
}

export const EMPTY_INTAKE_SECTIE7_CONTENT = {
  ad_auteur: null,
  ad_datum_iso: null,
  quote_advies_spoor2: null,
  quote_passende_functies: null,
  functie_categorien: [] as { naam: string; toelichting: string }[],
};
