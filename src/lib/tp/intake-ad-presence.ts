/** Helpers for Juni V6 concept intake and AD report presence on TP step 2/3. */

export type IntakeAdPresenceMeta = {
  intake_concept?: boolean | null;
  has_ad_report?: boolean | null;
  ad_report_date?: string | null;
};

export type AdPresenceInput = {
  has_ad_report?: boolean | null;
  intake_concept?: unknown;
  ad_report_date?: unknown;
};

export function normalizeIntakeConcept(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

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

/**
 * Resolve has_ad_report from stored meta + document evidence.
 * AD PDF or filled AD date overrides a false-positive Concept flag on intake.
 */
export function resolveEffectiveAdPresence(
  input: AdPresenceInput | null | undefined,
  hasAdDocument: boolean
): IntakeAdPresenceMeta {
  const ad_report_date = hasFilledAdReportDate(input?.ad_report_date)
    ? String(input!.ad_report_date).trim()
    : null;
  const intake_concept = normalizeIntakeConcept(input?.intake_concept);
  const hasAdDate = Boolean(ad_report_date);

  let has_ad_report: boolean;
  if (hasAdDocument || hasAdDate) {
    has_ad_report = true;
  } else if (input?.has_ad_report === true || input?.has_ad_report === false) {
    has_ad_report = input.has_ad_report;
  } else if (intake_concept === true) {
    has_ad_report = false;
  } else {
    has_ad_report = false;
  }

  const out: IntakeAdPresenceMeta = { has_ad_report };
  if (intake_concept !== undefined) out.intake_concept = intake_concept;
  if (ad_report_date) out.ad_report_date = ad_report_date;
  return out;
}

/** True when intake indicates no final AD report (and no AD document/date evidence). */
export function isNoAdIntake(
  meta?: IntakeAdPresenceMeta | null,
  opts?: { hasAdDocument?: boolean }
): boolean {
  const hasAdDocument = opts?.hasAdDocument ?? false;
  if (meta?.has_ad_report === true) return false;
  if (hasAdDocument || hasFilledAdReportDate(meta?.ad_report_date)) return false;
  if (meta?.intake_concept === true) return true;
  if (meta?.has_ad_report === false) return true;
  return false;
}

/** Apply AD presence rules to TP2 autofill extraction (mutates extracted). */
export function resolveTp2HasAdReport(
  extracted: Record<string, unknown>,
  hasAdDocument: boolean
): void {
  const resolved = resolveEffectiveAdPresence(
    {
      has_ad_report: extracted.has_ad_report as boolean | null | undefined,
      intake_concept: extracted.intake_concept,
      ad_report_date: extracted.ad_report_date,
    },
    hasAdDocument
  );

  extracted.has_ad_report = resolved.has_ad_report;
  if (resolved.intake_concept !== undefined) {
    extracted.intake_concept = resolved.intake_concept;
  } else {
    delete extracted.intake_concept;
  }
}

export const EMPTY_INTAKE_SECTIE7_CONTENT = {
  ad_auteur: null,
  ad_datum_iso: null,
  quote_advies_spoor2: null,
  functie_categorien: [] as { naam: string; toelichting: string }[],
};
