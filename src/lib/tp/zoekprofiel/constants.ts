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

/** Style reference — ChatGPT-like length and tone; do not copy content verbatim. */
export const STYLE_REFERENCE_V2 = `
Alinea 1: Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-2 niveau. Werknemer heeft de opleiding MBO-2 Facilitaire Dienstverlening afgerond. Hij heeft werkervaring opgedaan als maaltijdbezorger, webdeveloper en beveiliger.

Alinea 2: Passend zijn overzichtelijke en voorspelbare werkzaamheden met een duidelijke taakstructuur. Werkzaamheden waarbij langdurig staan geen wezenlijk onderdeel vormt zijn passend. Werkzaamheden met lichte fysieke belasting zijn passend. Regelmatige werktijden en geen nachtdiensten zijn passend.
`.trim();

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Zoekprofiel\s*/i;

/** Terms that should not appear in output. */
export const FORBIDDEN_TERMS = [
  'diagnose',
  'diagnoses',
  'benutbare mogelijkheden',
  'duurzame inzetbaarheid',
  'zoekrichting',
  'functierichting',
  'vaardigheden',
  'competenties',
  'certificaat',
  'rijbewijs',
  'computervaardig',
  'stagiair',
  'prognose',
  'behandeling',
  'medische behandeling',
  'werkgeversnaam',
] as const;

/** Redundant "functie binnen sector" phrasing seen in VAT outputs. */
export const REDUNDANT_SECTOR_PATTERNS: RegExp[] = [
  /\bbinnen de beveiligingssector\b/i,
  /\bbinnen een IT-omgeving\b/i,
  /\bbinnen een digitale\/IT-omgeving\b/i,
  /\bbinnen een administratieve\b/i,
  /\bbinnen de zorgsector\b/i,
  /\bbinnen de productiesector\b/i,
  /\baspirant beveiliger\b/i,
];

/** Literal FML numeric copy-paste patterns — para 2 should use positive formulations instead. */
export const NUMERIC_FML_PATTERNS: RegExp[] = [
  /\d+\s*kilogram/i,
  /\d+\s*kg\b/i,
  /\d+\s*minuten?\b/i,
  /\d+\s*uur per (werkdag|dag)\b/i,
  /\d{1,2}\.\d{2}\s*uur/i,
  /\d+\s*keer per (dag|week)\b/i,
];

/** Task/detail verbs and phrases in para 1 that indicate over-detailed VAT-style output. */
export const PARA1_TASK_DETAIL_PATTERNS: RegExp[] = [
  /\bverantwoordelijk\b/i,
  /\bmeerdere jaren\b/i,
  /\bjaren werkervaring\b/i,
  /\b\d+\s*jaar\b/i,
  /\bondersteunende\b/i,
  /\bcoördineren\b/i,
  /\brapporteren\b/i,
  /\bcameratoezicht\b/i,
  /\bsurveillancerondes\b/i,
  /\bADL-ondersteuning\b/i,
];

/** Para 2 should often start with personal/social positive openers (heuristic, not mandatory). */
export const POSITIVE_PARA2_OPENERS = [
  'passend zijn overzichtelijke',
  'overzichtelijke en voorspelbare',
  'voorspelbare werkzaamheden',
  'werkzaamheden met een overzichtelijke structuur',
  'passend zijn rustige',
] as const;

/** Education niveau hints for edge cases — included in prompt context. */
export const OPENING_NIVEAU_HINTS = `
Niveau-regels voor de openingszin:
- PDG (Postdoctorale opleiding) → hbo niveau (niet mbo-4)
- LHNO → LHNO-niveau (niet vmbo-niveau)
- Alleen hoogst afgeronde opleiding noemen; nooit lagere of onvoltooide opleidingen
- VMBO niet noemen als MBO-3 of hoger is afgerond
- Cursussen, certificaten en stagiair-rollen niet als opleiding of werkervaring
`.trim();
