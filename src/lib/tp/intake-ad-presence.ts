/** Helpers for Juni V6 concept intake — treat as no AD when Concept is checked. */

export type IntakeAdPresenceMeta = {
  intake_concept?: boolean | null;
  has_ad_report?: boolean | null;
};

export function normalizeIntakeConcept(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

/** True when intake indicates no final AD report (Concept checkbox or has_ad_report false). */
export function isNoAdIntake(meta?: IntakeAdPresenceMeta | null): boolean {
  if (!meta) return false;
  return meta.intake_concept === true || meta.has_ad_report === false;
}

export function resolveTp2HasAdReport(
  extracted: Record<string, unknown>,
  hasAdDocument: boolean
): void {
  const intakeConcept = normalizeIntakeConcept(extracted.intake_concept);
  if (intakeConcept === true) {
    extracted.intake_concept = true;
    extracted.has_ad_report = false;
    return;
  }

  if (intakeConcept === false) {
    extracted.intake_concept = false;
  } else {
    delete extracted.intake_concept;
  }

  if (hasAdDocument) {
    extracted.has_ad_report = true;
    return;
  }

  const adDate = extracted.ad_report_date;
  const hasAdDate =
    adDate != null && adDate !== '' && (typeof adDate !== 'string' || adDate.trim() !== '');
  extracted.has_ad_report = hasAdDate;
}

export const EMPTY_INTAKE_SECTIE7_CONTENT = {
  ad_auteur: null,
  ad_datum_iso: null,
  quote_advies_spoor2: null,
  functie_categorien: [] as { naam: string; toelichting: string }[],
};
