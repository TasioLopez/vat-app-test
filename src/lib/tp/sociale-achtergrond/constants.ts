/** Default model — override with OPENAI_SOCIALE_ACHTERGROND_MODEL. */
export const DEFAULT_SOCIALE_ACHTERGROND_MODEL = 'gpt-5.1-2025-11-13';

/** Target length per synthesized paragraph (reference TP style). */
export const MAX_WORDS_PER_ALINEA = 50;

/** Target total length for the full section. */
export const MAX_WORDS_TOTAL = 150;

/** Max sentences per paragraph. */
export const MAX_SENTENCES_PER_ALINEA = 4;

/** Topics to synthesize into each paragraph (prompt guidance only). */
export const ALINEA_1_TOPICS =
  'woonsituatie, gezinssituatie, familiecontacten, sociaal netwerk, sociale contacten, sociale steun, praktische omstandigheden (alleen indien essentieel)';

export const ALINEA_2_TOPICS =
  'huishoudelijke taken, zorgtaken, dagelijkse bezigheden, dagstructuur, activiteiten buitenshuis';

export const ALINEA_3_TOPICS =
  'vrije tijd, hobby\'s, sport, vrijwilligerswerk, maatschappelijke activiteiten';

/** Style reference — length and tone only; do not copy content. */
export const STYLE_REFERENCE_EXAMPLE = `
Alinea 1 (ca. 40 woorden): Werknemer woont samen met haar partner en kind in Zaandam. Zij heeft een sociaal netwerk van familie en vrienden. Het contact met haar moeder is ondersteunend.

Alinea 2 (ca. 45 woorden): Werknemer regelt het huishouden grotendeels zelfstandig. Zij combineert zorg voor haar kind met huishoudelijke taken en planning. Daarnaast onderhoudt zij sociale contacten buitenshuis.

Alinea 3 (ca. 35 woorden): In haar vrije tijd verkoopt werknemer tweedehands babykleding via Vinted. Zij besteedt tijd aan activiteiten met haar kind.
`.trim();

/** Phrases the model must not use; stripped in post-processing when present. */
export const BANNED_PHRASES = [
  'werknemer geeft aan dat',
  'werknemer geeft aan',
  'werknemer beschrijft',
  'werknemer omschrijft zichzelf als',
  'werknemer ziet zichzelf als',
  'werknemer ervaart',
  'werknemer vindt',
  'werknemer wil',
  'werknemer zou willen',
  'werknemer hoopt',
  'hierover is geen informatie beschikbaar',
  'niet bekend is of',
  'werknemer heeft hierover niets vermeld',
  'hierover zijn geen gegevens opgenomen',
] as const;

/** Personality/self-description terms — model must omit; used in prompt. */
export const PERSONALITY_BLOCKLIST = [
  'sociaal',
  'behulpzaam',
  'zorgzaam',
  'zelfstandig',
  'ondernemend',
  'extravert',
  'introvert',
  'verbinder',
  'doorzetter',
  'positief ingesteld',
  'houdt van mensen',
  'houdt van contact',
  'mensenmens',
  'creatieve geest',
] as const;
