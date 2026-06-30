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
}

export const EMPTY_INTAKE_SECTIE7_CONTENT = {
  ad_auteur: null,
  ad_datum_iso: null,
  quote_advies_spoor2: null,
  functie_categorien: [] as { naam: string; toelichting: string }[],
};
