export type PowMeterContentResult = {
  huidige_trede_tekst: string;
  huidige_werkzame_uren: string;
  verwachting_3_maanden: string;
  toelichting_pow: string;
};

export const POW_METER_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    huidige_trede_tekst: {
      type: 'string',
      description:
        'Start with "Werknemer bevindt zich in trede [nummer] van de POW-meter™."',
    },
    huidige_werkzame_uren: {
      type: 'string',
      description:
        'Max 2 sentences, ~25 words. Lead with weekly hours (e.g. "0,5 uur per week."). No narrative paragraph.',
    },
    verwachting_3_maanden: {
      type: 'string',
      description:
        'Max 3 sentences, ~60 words. Must start with "Werknemer bevindt zich vermoedelijk in trede [nummer] van de POW-meter™." No long Spoor 2 block.',
    },
    toelichting_pow: {
      type: 'string',
      description:
        'Arbeidsdeskundige onderbouwing, 150–250 words prose, no bullet lists, no diagnoses.',
    },
  },
  required: [
    'huidige_trede_tekst',
    'huidige_werkzame_uren',
    'verwachting_3_maanden',
    'toelichting_pow',
  ],
  additionalProperties: false,
} as const;

function coerceString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function parsePowMeterContentResult(raw: unknown): PowMeterContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    huidige_trede_tekst: coerceString(o.huidige_trede_tekst),
    huidige_werkzame_uren: coerceString(o.huidige_werkzame_uren),
    verwachting_3_maanden: coerceString(o.verwachting_3_maanden),
    toelichting_pow: coerceString(o.toelichting_pow),
  };
}
