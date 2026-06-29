/** Default model — override with OPENAI_ZOEKPROFIEL_MODEL. */
export const DEFAULT_ZOEKPROFIEL_MODEL = 'gpt-5.1-2025-11-13';

/** Zoekprofiel V2 — total word count (both paragraphs combined). */
export const MIN_WORDS_TOTAL = 150;

export const MAX_WORDS_TOTAL = 225;

/** Mandatory V2 opening — [niveau] filled by model (e.g. mbo-2 niveau, hbo niveau). */
export const OPENING_PREFIX =
  'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal';

export const OPENING_PATTERN =
  /^Op basis van de afgeronde opleiding\(en\) en werkervaring is werknemer aangewezen op functies op maximaal\s+.+\.$/i;

export type BelastbaarheidsdocumentType = 'fml' | 'izp' | 'lab';

/** Server-appended closing for paragraph 1 — [datum] replaced at assembly time. */
export const PARA1_CLOSING_TEMPLATES: Record<BelastbaarheidsdocumentType, string> = {
  fml:
    'Bij de zoektocht naar passende arbeid zal naast het persoonlijk profiel van werknemer rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in de Functionele Mogelijkhedenlijst van [datum].',
  izp:
    'Bij de zoektocht naar passende arbeid zal naast het persoonlijk profiel van werknemer rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in het Inzetbaarheidsprofiel van [datum].',
  lab:
    'Bij de zoektocht naar passende arbeid zal naast het persoonlijk profiel van werknemer rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in de Lijst arbeidsmogelijkheden en beperkingen van [datum].',
};

/** Style reference — length and tone only; do not copy content. */
export const STYLE_REFERENCE_V2 = `
Alinea 1: Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-2 niveau. Werknemer heeft de opleiding MBO-2 Facilitaire Dienstverlening afgerond. Hij heeft werkervaring opgedaan als magazijnmedewerker en productiemedewerker.

Alinea 2: Werkzaamheden met een overzichtelijke structuur en voorspelbare werkomgeving zijn passend. Werkzaamheden waarbij langdurig staan geen wezenlijk onderdeel vormt zijn passend. Regelmatige werktijden en geen nachtdiensten zijn passend.
`.trim();

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Zoekprofiel\s*/i;

/** Terms that should not appear in output (post-check warnings only). */
export const FORBIDDEN_TERMS = [
  'diagnose',
  'diagnoses',
  'benutbare mogelijkheden',
  'duurzame inzetbaarheid',
  'zoekrichting',
  'functierichting',
] as const;
