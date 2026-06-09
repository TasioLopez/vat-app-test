/** Default model — override with OPENAI_ZOEKPROFIEL_MODEL. */
export const DEFAULT_ZOEKPROFIEL_MODEL = 'gpt-5.1-2025-11-13';

/** Target length per paragraph (UWV reference style). */
export const MAX_WORDS_ALINEA_1 = 120;

export const MAX_WORDS_ALINEA_3 = 100;

export const MAX_WORDS_ALINEA_4 = 100;

/** Max sentences per paragraph. */
export const MAX_SENTENCES_ALINEA_1 = 6;

export const MAX_SENTENCES_ALINEA_3 = 5;

export const MAX_SENTENCES_ALINEA_4 = 5;

/** Mandatory niveau sentences — exactly one must appear in alinea_1. */
export const NIVEAU_SENTENCES = [
  'Werknemer is aangewezen op functies op maximaal vmbo-niveau.',
  'Werknemer is aangewezen op functies op maximaal mbo-niveau.',
  'Werknemer is aangewezen op functies op maximaal mbo+/hbo-niveau.',
  'Werknemer is aangewezen op functies op maximaal hbo-niveau.',
] as const;

export const NIVEAU_SENTENCE_PATTERN =
  /Werknemer is aangewezen op functies op maximaal (vmbo|mbo|mbo\+\/hbo|hbo)-niveau\./i;

/** Exact PDF boilerplate for alinea 2 — [datum] replaced at assembly time. */
export const FML_ALINEA_2_TEMPLATE =
  'Bij de zoektocht naar passende arbeid zal, naast het persoonlijk profiel van werknemer, rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in de Functionele Mogelijkheden Lijst opgesteld op [datum].';

export const IZP_ALINEA_2_TEMPLATE =
  'Bij de zoektocht naar passende arbeid zal, naast het persoonlijk profiel van werknemer, rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in het Inzetbaarheidsprofiel opgesteld op [datum].';

/** Style reference — length and tone only; do not copy content. */
export const STYLE_REFERENCE_EXAMPLE = `
Alinea 1: Werknemer heeft werkervaring opgedaan als administratief medewerker en receptionist. Werknemer heeft mbo-4 Administratie afgerond. Werknemer is aangewezen op functies op maximaal mbo-niveau. Passende arbeid ligt in de richting van administratieve en ondersteunende functies.

Alinea 3: Werknemer is aangewezen op werkzaamheden met een duidelijke structuur en een overzichtelijk takenpakket. Werkdruk en multitasken dienen beperkt te blijven. Ondersteuning door collega's of leidinggevende is passend.

Alinea 4: Werknemer is aangewezen op werkzaamheden binnen gebruikelijke werkhoogte met beperkte til- en draagbelasting. Afwisseling van houding en werkzaamheden is passend. Dagdienst is passend.
`.trim();

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Zoekprofiel\s*/i;
