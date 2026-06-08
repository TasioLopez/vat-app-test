/** Static paragraph when no AD report is available (masterprompt alinea 8). */
export const INLEIDING_GEEN_AD =
  'Tijdens het opstellen van het trajectplan was het arbeidsdeskundig rapport nog niet beschikbaar voor de loopbaanadviseur. Eventuele adviezen van de arbeidsdeskundige zullen worden verwerkt in de voortgangsrapportage.';

/** Fixed opening of alinea 5 (medische situatie). */
export const MEDISCHE_SITUATIE_OPENING =
  'Werknemer vertelt openhartig over de reden van zijn/haar ziekmelding, de aanleiding hiervan en de samenhangende gezondheidsproblemen. Gezien de wetgeving verwerking persoonsgegevens worden er geen medische gegevens geregistreerd in dit rapport.';

export const MEDISCHE_BEGELEIDING_ZINNEN = {
  actief:
    'Voor zijn/haar aandoeningen is werknemer onder behandeling binnen het reguliere medische zorgcircuit.',
  afgerond:
    'Voor zijn/haar aandoeningen was werknemer onder behandeling binnen het reguliere medische zorgcircuit.',
  toekomstig:
    'Voor zijn/haar aandoeningen zal werknemer naar verwachting worden behandeld binnen het reguliere medische zorgcircuit.',
} as const;

export const VALENTINEZ_DOEL_BASE =
  'ValentineZ heeft uitgelegd wat het doel is van het 2e spoortraject. Werknemer geeft aan de noodzaak van het tweede spoor te begrijpen en mee te werken.';

export const VALENTINEZ_DOEL_AFSLUITING =
  'In het tweede spoor traject zal o.a. onderzocht worden welke passende mogelijkheden er op de arbeidsmarkt zijn.';

/** Delimiter matched by InleidingSubBlock (intro ends with this phrase). */
export const AD_INTRO_SUFFIX =
  'staat het volgende advies ten aanzien van het inzetten van een tweede spoor traject:';

/** Legacy AD intro delimiter (still present in older inleiding_sub values). */
export const AD_INTRO_SUFFIX_LEGACY = 'staat het volgende:';

/** Whether inleiding_sub should render via InleidingSubBlock (bold intro + italic quote). */
export function isAdSubBlock(text: string): boolean {
  return text.includes(AD_INTRO_SUFFIX) || text.includes(AD_INTRO_SUFFIX_LEGACY);
}

/** Default model — override with OPENAI_INLEIDING_MODEL (e.g. gpt-5.1-2025-11-13). */
export const DEFAULT_INLEIDING_MODEL = 'gpt-5.1-2025-11-13';

/** Optional: OPENAI_INLEIDING_REASONING = low | medium | high */
