/** Default model — override with OPENAI_PERSOONLIJK_PROFIEL_MODEL. */
export const DEFAULT_PERSOONLIJK_PROFIEL_MODEL = 'gpt-5.1-2025-11-13';

/** Target length per paragraph (UWV reference style). */
export const MAX_WORDS_ALINEA_1 = 110;

export const MAX_WORDS_ALINEA_2 = 80;

/** @deprecated Alinea 3 is never autofilled; kept for schema compatibility. */
export const MAX_WORDS_ALINEA_3 = 40;

/** Target total length for the full section (two paragraphs). */
export const MAX_WORDS_TOTAL = 190;

/** Max sentences per paragraph. */
export const MAX_SENTENCES_ALINEA_1 = 6;

export const MAX_SENTENCES_ALINEA_2 = 5;

/** @deprecated Alinea 3 is never autofilled; kept for schema compatibility. */
export const MAX_SENTENCES_ALINEA_3 = 3;

/** Mandatory opening template (leeftijd/geslacht from context; duur/functies from intake). */
export const OPENING_SENTENCE_TEMPLATE =
  'Werknemer is een [leeftijd]-jarige [man/vrouw/persoon] met [duur] werkervaring als [functie(s)].';

/** Style reference — length and tone only; do not copy content. Two paragraphs, no alinea_3. */
export const STYLE_REFERENCE_EXAMPLE = `
Alinea 1: Werknemer is een 32-jarige vrouw met circa twaalf jaar werkervaring als logistiek coördinator, transportplanner en logistiek medewerker. Werknemer heeft de opleiding MBO 4 Manager Transport & Logistiek afgerond. Daarnaast heeft zij de opleidingen BHV en Lean Six Sigma Green Belt (basis) afgerond.

Alinea 2: Werknemer beschikt over rijbewijs B en verplaatst zich met de auto. De Nederlandse taal beheerst werknemer goed in spreken, lezen en schrijven. De Engelse taal beheerst werknemer goed in spreken en lezen en redelijk in schrijven. Werknemer beschikt over een pc of laptop, heeft geavanceerde computervaardigheden met meerdere programma’s en aanvullende ervaring met SAP ERP en een WMS, en beschikt over goede typvaardigheden.
`.trim();

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Persoonlijk profiel\s*/i;

/** Opening validation prefix. */
export const OPENING_PREFIX = 'Werknemer is een';

/** Phrases the model must not use; stripped in post-processing when present. */
export const BANNED_PHRASES = [
  'in het intakeformulier',
  'intakeformulier',
  'intake formulier',
  'hierover is geen informatie beschikbaar',
  'hierover zijn geen gegevens opgenomen',
  'niet opgenomen in het',
  'niet vermeld in het',
  'niet benoemd in het',
  'geen expliciet benoemde vaardigheden',
  'verdere expliciet benoemde vaardigheden',
] as const;

/** Matches source-document references in output (for sentence removal). */
export const SOURCE_REFERENCE_PATTERN =
  /\b(intake\s*-?\s*formulier|intakeformulier|het\s+formulier|bron\s*document)\b/i;

/** Matches meta-sentences about missing or unavailable information. */
export const MISSING_INFO_PATTERN =
  /\b(niet opgenomen|niet vermeld|niet benoemd|geen informatie beschikbaar|geen gegevens opgenomen|expliciet benoemde vaardigheden)\b/i;

/**
 * Chronology / timeline narration — strip entire sentence when matched.
 * Targets: sinds [jaar], tussen … en …, in de periode, year ranges (2014-2018 / 2014 tot 2018).
 */
export const CHRONOLOGY_SENTENCE_PATTERN =
  /\b(sinds\s+\d{4}|tussen\s+\d{4}\s+en\s+\d{4}|in\s+de\s+periode\b|\d{4}\s*[-–—]\s*\d{4}|\d{4}\s+tot\s+\d{4})\b/i;

/**
 * Soft judgment / motivation / personality remarks — strip entire sentence when matched.
 */
export const SOFT_TRAIT_SENTENCE_PATTERN =
  /\b(gemotiveerd|wordt\s+omschreven\s+als|geeft\s+aan\s+dat|ziet\s+zichzelf\s+als|te\s+aardig|te\s+lief|veel\s+rek\s+heeft|tot\s+de\s+streep|erg\s+gemotiveerd|persoonskenmerk)\b/i;

/** PC/laptop mention (for smartphone fallback sanitizer). */
export const PC_LAPTOP_PATTERN = /\b(pc|laptop|computer)\b/i;

/** Smartphone mention to strip when PC/laptop is also present. */
export const SMARTPHONE_PATTERN =
  /\b(smart\s*-?\s*phone|smartphone|mobiele\s+telefoon|mobiel(?:e)?\s+telefoon)\b/i;
