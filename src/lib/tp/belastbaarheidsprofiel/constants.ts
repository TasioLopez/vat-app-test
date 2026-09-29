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

export const DEFAULT_BELASTBAARHEID_MODEL = 'gpt-5.6-sol';

export const FML_INTRO_TEMPLATE =
  'Werknemer heeft, in overeenstemming met de Functionele Mogelijkheden Lijst (FML) van {datum}, opgesteld door {artsPhrase}, beperkingen in de volgende rubrieken:';

export const IZP_INTRO_TEMPLATE =
  'Werknemer heeft, in overeenstemming met het Inzetbaarheidsprofiel (IZP) van {datum}, opgesteld door {artsPhrase}, beperkingen in de volgende rubrieken:';

export const MEDISCH_SPREEKUUR_INTRO_TEMPLATE =
  'Conform de terugkoppeling van het medisch spreekuur, opgesteld op {datum} door {artsPhrase}, staat onderstaande vermeld.';

/** Standard sentence when no FML/IZP/LAB and no spreekuur rapportage are available. */
export const BELASTBAARHEID_GEEN_PROFIEL =
  'Tijdens het opstellen van het trajectplan was het belastbaarheidsprofiel nog niet beschikbaar voor de loopbaanadviseur. Hierdoor kan er momenteel nog geen zoekprofiel opgesteld worden. Zodra dit beschikbaar is gesteld zal het zoekprofiel worden opgesteld.';

export const GENERATION_FALLBACK =
  '[Belastbaarheidsprofiel — AI generatie mislukt, handmatig invullen vereist]';
