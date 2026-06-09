/** Default model — override with OPENAI_PERSOONLIJK_PROFIEL_MODEL. */
export const DEFAULT_PERSOONLIJK_PROFIEL_MODEL = 'gpt-5.1-2025-11-13';

/** Target length per paragraph (UWV reference style). */
export const MAX_WORDS_ALINEA_1 = 110;

export const MAX_WORDS_ALINEA_2 = 80;

export const MAX_WORDS_ALINEA_3 = 40;

/** Target total length for the full section. */
export const MAX_WORDS_TOTAL = 220;

/** Max sentences per paragraph. */
export const MAX_SENTENCES_ALINEA_1 = 6;

export const MAX_SENTENCES_ALINEA_2 = 5;

export const MAX_SENTENCES_ALINEA_3 = 3;

/** Mandatory opening template (leeftijd/geslacht from context; duur/functies from intake). */
export const OPENING_SENTENCE_TEMPLATE =
  'Werknemer is een [leeftijd]-jarige [man/vrouw/persoon] met [duur] werkervaring als [functie(s)].';

/** Style reference — length and tone only; do not copy content. */
export const STYLE_REFERENCE_EXAMPLE = `
Alinea 1: Werknemer is een 58-jarige vrouw met circa vijf jaar werkervaring als huishoudelijk ondersteuner. Werknemer heeft de mavo afgerond. Werknemer heeft een mbo-opleiding tot apothekersassistent afgerond.

Alinea 2: Werknemer beschikt over rijbewijs B. Werknemer heeft de beschikking over een auto. De Nederlandse taal beheerst werknemer goed in spreken, lezen en schrijven. Werknemer beschikt over een pc of laptop en kan met een computer omgaan.

Alinea 3 (alleen indien objectief benoemd): Werknemer wordt omschreven als nauwkeurig en klantgericht.
`.trim();

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Persoonlijk profiel\s*/i;

/** Opening validation prefix. */
export const OPENING_PREFIX = 'Werknemer is een';
