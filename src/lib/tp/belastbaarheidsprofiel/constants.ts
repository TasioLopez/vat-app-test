/** Delimiter between limitations block and prognose quotes. */
export const PROGNOSE_DELIMITER = '<<<PROGNOSE>>>';

export const STANDARD_RUBRIEKEN = [
  'Persoonlijk functioneren',
  'Sociaal functioneren',
  'Aanpassing aan fysieke omgevingseisen',
  'Dynamische handelingen',
  'Statische houdingen',
  'Werktijden',
] as const;

export const DEFAULT_BELASTBAARHEID_MODEL = 'gpt-5.1-2025-11-13';

export const FML_INTRO_TEMPLATE =
  'Werknemer heeft, in overeenstemming met de Functionele Mogelijkheden Lijst (FML) van {datum}, opgesteld door {artsPhrase}, beperkingen in de volgende rubrieken:';

export const MEDISCH_SPREEKUUR_INTRO_TEMPLATE =
  'Conform de terugkoppeling van het medisch spreekuur, opgesteld op {datum} door {artsPhrase}, staat onderstaande vermeld.';

export const GENERATION_FALLBACK =
  '[Belastbaarheidsprofiel — AI generatie mislukt, handmatig invullen vereist]';
