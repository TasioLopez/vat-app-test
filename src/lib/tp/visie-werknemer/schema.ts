/** Structured content: two synthesized paragraphs + spoor 2 preference flag. */
export type VisieWerknemerContentResult = {
  alinea_1: string | null;
  alinea_2: string | null;
  heeft_concrete_spoor2_voorkeuren: boolean;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

/** JSON schema for OpenAI Structured Outputs (strict). */
export const VISIE_WERKNEMER_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    alinea_1: nullableStringProperty(
      'Synthesized paragraph 1 (huidige situatie): max 5 sentences, ~80-100 words. Null when no relevant intake info.'
    ),
    alinea_2: nullableStringProperty(
      'Synthesized paragraph 2 (spoor 2 en toekomst): houding + motivatie; concrete voorkeuren only if explicitly named. Max 4 sentences, ~60-90 words. Null when no relevant intake info.'
    ),
    heeft_concrete_spoor2_voorkeuren: {
      type: 'boolean',
      description:
        'True only when worker explicitly named functies, branches, interesses, talenten, or scholingswensen as possible spoor 2 direction.',
    },
  },
  required: ['alinea_1', 'alinea_2', 'heeft_concrete_spoor2_voorkeuren'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function parseVisieWerknemerContentResult(raw: unknown): VisieWerknemerContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    alinea_1: coerceNullableString(o.alinea_1),
    alinea_2: coerceNullableString(o.alinea_2),
    heeft_concrete_spoor2_voorkeuren: Boolean(o.heeft_concrete_spoor2_voorkeuren),
  };
}
