/** Default model — override with OPENAI_ZOEKPROFIEL_MODEL. */
export const DEFAULT_ZOEKPROFIEL_MODEL = 'gpt-5.6-sol';

/** Zoekprofiel V1.3 — total word count (both paragraphs combined). */
export const MIN_WORDS_TOTAL = 150;

export const MAX_WORDS_TOTAL = 225;

/** Mandatory V1.3 opening — [niveau] filled by model (e.g. mbo-2 niveau, hbo niveau). */
export const OPENING_PREFIX =
  'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal';

export const OPENING_PATTERN =
  /^Op basis van de afgeronde opleiding\(en\) en werkervaring is werknemer aangewezen op functies op maximaal\s+.+\.$/i;

export type BelastbaarheidsdocumentType = 'fml' | 'izp' | 'lab';

/**
 * Server-appended closing for paragraph 1 — [datum] replaced at assembly time.
 * V1.3: always use full document names, never abbreviations FML/IZP/LAB in output.
 */
export const PARA1_CLOSING_TEMPLATES: Record<BelastbaarheidsdocumentType, string> = {
  fml:
    'Bij de zoektocht naar passende arbeid zal naast het persoonlijk profiel van werknemer rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in de Functionele Mogelijkheden Lijst van [datum].',
  izp:
    'Bij de zoektocht naar passende arbeid zal naast het persoonlijk profiel van werknemer rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in het Inzetbaarheidsprofiel van [datum].',
  lab:
    'Bij de zoektocht naar passende arbeid zal naast het persoonlijk profiel van werknemer rekening worden gehouden met de beperkingen en voorwaarden zoals vastgelegd in de Lijst arbeidsmogelijkheden en beperkingen van [datum].',
};

/** Style reference — length and tone; do not copy content verbatim. */
export const STYLE_REFERENCE_V13 = `
Alinea 1: Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-2 niveau. Werknemer heeft de opleiding MBO-2 Facilitaire Dienstverlening afgerond. Hij heeft werkervaring opgedaan als maaltijdbezorger, webdeveloper en beveiliger.

Alinea 2: Passend zijn overzichtelijke en voorspelbare werkzaamheden met een duidelijke taakstructuur. Werkzaamheden waarbij langdurig staan geen wezenlijk onderdeel vormt zijn passend. Werkzaamheden met lichte fysieke belasting zijn passend. Regelmatige werktijden en geen nachtdiensten zijn passend.
`.trim();

/** @deprecated Use STYLE_REFERENCE_V13 */
export const STYLE_REFERENCE_V2 = STYLE_REFERENCE_V13;

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Zoekprofiel\s*/i;

/** Terms that should not appear in output (matched with word boundaries where needed). */
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
  'klacht',
  'klachten',
  'medicatie',
  'medische oorzaak',
  'motivatie',
  'hobby',
  "hobby's",
  'interesse',
  'interesses',
  'voorbeeldfunctie',
  'voorbeeldfuncties',
  'arbeidsmarkt',
  'newton',
  'kilogramkracht',
  'kgf',
] as const;

/** Multi-word or ambiguous forbidden phrases — use word-boundary regex. */
export const FORBIDDEN_TERM_PATTERNS: RegExp[] = [
  /\bklachten?\b/i,
  /\bmedicatie\b/i,
  /\bmedische\s+oorzaak\b/i,
  /\bmotivatie\b/i,
  /\bhobby'?s?\b/i,
  /\binteresses?\b/i,
  /\bvoorbeeldfuncties?\b/i,
  /\barbeidsmarkt\b/i,
  /\bnewton\b/i,
  /\bkilogramkracht\b/i,
  /\bkgf\b/i,
  /\btalen?\b/i,
  /\bengels\b/i,
  /\bduits\b/i,
  /\bfrans\b/i,
];

/** Build a word-boundary pattern for a forbidden term string. */
export function forbiddenTermPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  // Multi-word: full phrase. Single token: prefix match so stems like "computervaardig" catch "computervaardigheden".
  if (term.includes(' ')) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
  return new RegExp(`\\b${escaped}`, 'i');
}

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
  /\bnewton\b/i,
  /\bkgf\b/i,
  /\bkilogramkracht\b/i,
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

/** Body parts forbidden in output (V1.3). */
export const BODY_PART_PATTERNS: RegExp[] = [
  /\bheupen?\b/i,
  /\bknie[eë]n?\b/i,
  /\benkels?\b/i,
  /\brug\b/i,
  /\bnek\b/i,
  /\bhoofd\b/i,
  /\bschouders?\b/i,
  /\bellebogen?\b/i,
  /\bpolsen?\b/i,
  /\bvoeten?\b/i,
  /\bhanden?\b/i,
  /\bbenen?\b/i,
  /\barmen?\b/i,
  /\bruggengraat\b/i,
  /\bwervelkolom\b/i,
];

/** Only allowed body-related term when a height limit must be preserved. */
export const BODY_PART_ALLOWED = /\bschouderhoogte\b/i;

/** Explicit heuphoogte variants (forbidden; translate to neutral work height). */
export const HEUP_HEIGHT_PATTERNS: RegExp[] = [
  /\bheuphoogte\b/i,
  /\bop\s+heuphoogte\b/i,
  /\bonder\s+heuphoogte\b/i,
];

/**
 * Conditions that must not appear unless explicitly in the leading belastbaarheidsdocument.
 * Heuristic warning — cannot verify source from text alone.
 */
export const UNSOURCED_CONDITION_PATTERNS: RegExp[] = [
  /\burenopbouw\b/i,
  /\bherstelmomenten?\b/i,
  /\bvervoersvoorwaarde\b/i,
  /\bextra\s+rust\b/i,
];

/** V1.3 rubrics to check in the leading belastbaarheidsdocument. */
export const BELASTBAARHEID_RUBRICS = [
  'persoonlijk functioneren',
  'sociaal functioneren',
  'fysieke omgevingseisen',
  'dynamische handelingen',
  'statische houdingen',
  'werktijden',
  'overige beperkingen en voorwaarden',
] as const;

/** Directional natural formulations for paragraph 2 (not mandatory literals). */
export const NATURAL_FORMULATION_EXAMPLES = `
"Passend zijn werkzaamheden waarin…"
"Werknemer kan worden ingezet in werk dat…"
"Het werk biedt ruimte voor…"
"Een passende werkomgeving kenmerkt zich door…"
"Buigen kan in beperkte mate voorkomen."
"Belastende bewegingen maken slechts incidenteel deel uit van het werk."
`.trim();

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
- Leid nooit een hoger niveau af uit werkervaring, vaardigheden, een functietitel of een niet-afgeronde opleiding
`.trim();

/** Server-side clarification when no belastbaarheidsdocument is available. */
export const MISSING_BELASTBAARHEIDSDOC_CLARIFICATION =
  'Upload het meest recente belastbaarheidsdocument (Functionele Mogelijkheden Lijst, Inzetbaarheidsprofiel of Lijst arbeidsmogelijkheden en beperkingen) om het zoekprofiel te kunnen opstellen.';
