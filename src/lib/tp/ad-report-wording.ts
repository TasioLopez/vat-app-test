/** Wording helpers when the AD report is marked as a concept (Juni V6 checkbox). */

/** Coerce concept flag; null/unknown/missing → false (only explicit true is concept). */
export function normalizeAdReportConcept(value: unknown): boolean {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return false;
}

export function isAdReportConcept(meta?: { ad_report_concept?: boolean | null }): boolean {
  return meta?.ad_report_concept === true;
}

/** Definitive AD report present at registration (not a concept). */
export function hasDefinitiveAdReport(meta?: {
  has_ad_report?: boolean | null;
  ad_report_concept?: boolean | null;
}): boolean {
  return meta?.has_ad_report === true && !isAdReportConcept(meta);
}

/** Intake has AD-related narrative (definitive or concept). */
export function hasIntakeAdNarrative(meta?: {
  has_ad_report?: boolean | null;
  ad_report_concept?: boolean | null;
}): boolean {
  return isAdReportConcept(meta) || meta?.has_ad_report === true;
}

export function adReportDateLabel(concept: boolean): string {
  return concept ? 'Datum concept AD rapportage' : 'Datum AD rapportage';
}

export function buildAdAdviesIntroPrefix(concept: boolean): string {
  return concept
    ? 'In het concept arbeidsdeskundigrapport,'
    : 'In het arbeidsdeskundigrapport,';
}

export function buildInleidingAdIntroPrefix(concept: boolean): string {
  return concept
    ? 'In het concept arbeidsdeskundig rapport'
    : 'In het arbeidsdeskundig rapport';
}

const ADVIES_INTRO_STANDARD = 'In het arbeidsdeskundigrapport,';
const ADVIES_INTRO_CONCEPT = 'In het concept arbeidsdeskundigrapport,';
const INLEIDING_INTRO_STANDARD = 'In het arbeidsdeskundig rapport';
const INLEIDING_INTRO_CONCEPT = 'In het concept arbeidsdeskundig rapport';

export function patchAdviesIntroForConcept(intro: string, concept: boolean): string {
  if (!intro.trim()) return intro;
  if (concept) {
    if (intro.includes(ADVIES_INTRO_CONCEPT)) return intro;
    return intro.replace(ADVIES_INTRO_STANDARD, ADVIES_INTRO_CONCEPT);
  }
  return intro.replace(ADVIES_INTRO_CONCEPT, ADVIES_INTRO_STANDARD);
}

export function patchInleidingAdIntroForConcept(intro: string, concept: boolean): string {
  if (!intro.trim()) return intro;
  if (concept) {
    if (intro.includes(INLEIDING_INTRO_CONCEPT)) return intro;
    return intro.replace(INLEIDING_INTRO_STANDARD, INLEIDING_INTRO_CONCEPT);
  }
  return intro.replace(INLEIDING_INTRO_CONCEPT, INLEIDING_INTRO_STANDARD);
}
