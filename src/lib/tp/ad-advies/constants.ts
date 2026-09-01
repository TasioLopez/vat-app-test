/** Delimiter between intro and AD advice quote. */
export const ADVIES_DELIMITER = '<<<ADVIES>>>';

export const ADVIES_INTRO_SUFFIX = 'staat het volgende advies over passende arbeid:';

export const ADVIES_INTRO_NO_FUNCTIES_SUFFIX = 'worden geen passende functies benoemd.';

/** Legacy placeholder kept for stored trajectplannen. */
export const ADVIES_NB_NO_REPORT_LEGACY =
  'N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.';

export const ADVIES_NB_NO_REPORT =
  'Tijdens het opstellen van het trajectplan was het arbeidsdeskundig rapport nog niet beschikbaar voor de loopbaanadviseur. Eventuele adviezen van de arbeidsdeskundige zullen worden verwerkt in de voortgangsrapportage.';

export function isAdviesNbNoReport(text: string | null | undefined): boolean {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return false;
  return trimmed === ADVIES_NB_NO_REPORT || trimmed === ADVIES_NB_NO_REPORT_LEGACY;
}

export const DEFAULT_AD_ADVIES_MODEL = 'gpt-5.6-sol';

export const GENERATION_FALLBACK =
  '[Advies passende arbeid — AI generatie mislukt, handmatig invullen vereist]';
