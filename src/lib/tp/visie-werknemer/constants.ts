/** Default model — override with OPENAI_VISIE_WERKNEMER_MODEL. */
export const DEFAULT_VISIE_WERKNEMER_MODEL = 'gpt-5.1-2025-11-13';

/** Target length per synthesized paragraph (reference TP / UWV style). */
export const MAX_WORDS_ALINEA_1 = 100;

export const MAX_WORDS_ALINEA_2 = 90;

/** Target total length for the full section. */
export const MAX_WORDS_TOTAL = 180;

/** Max sentences per paragraph. */
export const MAX_SENTENCES_ALINEA_1 = 5;

export const MAX_SENTENCES_ALINEA_2 = 4;

/** Neutral closing when worker named no concrete spoor 2 preferences. */
export const SPOOR2_NEUTRAL_CLOSING =
  'Binnen het tweede spoortraject zullen de mogelijkheden en passende arbeidsrichtingen nader worden onderzocht.';

/** Substring check — avoid duplicating closing if model already included it. */
export const SPOOR2_NEUTRAL_CLOSING_MARKER = 'passende arbeidsrichtingen nader worden onderzocht';

/** Topics for alinea 1 (prompt guidance only). */
export const ALINEA_1_TOPICS =
  'dienstverbandduur, werkbeleving, relatie met collega\'s/leiding/cliënten, belang van werk, wens terugkeer eigen werk, spoor 1 activiteiten, aangepast werk, visie op werkhervatting';

/** Topics for alinea 2 (prompt guidance only). */
export const ALINEA_2_TOPICS =
  'houding ten opzichte van spoor 2, motivatie arbeidsproces; optioneel: functies, branches, interesses, talenten, scholingswensen (alleen indien expliciet door werknemer genoemd als spoor 2 richting)';

/** Style reference — length and tone only; do not copy content. */
export const STYLE_REFERENCE_EXAMPLE = `
Alinea 1 (ca. 95 woorden): Werknemer is sinds 1998 in dienst bij de huidige organisatie en geeft aan haar werk altijd met veel plezier te hebben uitgevoerd. Zij ervaart de organisatie positief en waardeert het contact met collega's en cliënten. Werknemer spreekt de wens uit om terug te keren in haar eigen functie en zet zich hiervoor actief in. Momenteel bouwt zij haar werkzaamheden op binnen spoor 1 en verricht zij aangepast werk.

Alinea 2 (ca. 85 woorden): Ten aanzien van spoor 2 geeft werknemer aan dat zij zal meewerken aan het traject en openstaat voor het verkennen van mogelijkheden om weer duurzaam deel te nemen aan het arbeidsproces. Op dit moment heeft zij geen concrete voorkeuren voor andere functies, werkzaamheden, branches of opleidingsrichtingen benoemd. Binnen het tweede spoortraject zullen haar mogelijkheden en passende arbeidsrichtingen nader worden onderzocht.
`.trim();

/** Accidental section heading the model must not include in body text. */
export const SECTION_HEADING_PATTERN = /^Visie van werknemer\s*/i;
