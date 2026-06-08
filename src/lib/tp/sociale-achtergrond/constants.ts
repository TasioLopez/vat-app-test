/** Default model — override with OPENAI_SOCIALE_ACHTERGROND_MODEL. */
export const DEFAULT_SOCIALE_ACHTERGROND_MODEL = 'gpt-5.1-2025-11-13';

/** Alinea 1 topic keys (fixed assembly order). */
export const ALINEA_1_KEYS = [
  'woonsituatie',
  'gezinssituatie',
  'familiecontacten',
  'sociaal_netwerk',
  'sociale_contacten',
  'sociale_steun',
  'praktische_omstandigheden',
] as const;

/** Alinea 2 topic keys (fixed assembly order). */
export const ALINEA_2_KEYS = [
  'huishoudelijke_taken',
  'zorgtaken',
  'dagelijkse_bezigheden',
  'dagstructuur',
  'activiteiten_buitenshuis',
] as const;

/** Alinea 3 topic keys (fixed assembly order). */
export const ALINEA_3_KEYS = [
  'vrije_tijd',
  'hobby',
  'sport',
  'vrijwilligerswerk',
  'maatschappelijke_activiteiten',
] as const;

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
