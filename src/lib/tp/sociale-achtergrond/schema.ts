/** Structured content: three synthesized paragraphs (not per-topic fragments). */
export type SocialeAchtergrondContentResult = {
  alinea_1: string | null;
  alinea_2: string | null;
  alinea_3: string | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

/** JSON schema for OpenAI Structured Outputs (strict). */
export const SOCIALE_ACHTERGROND_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    alinea_1: nullableStringProperty(
      'Synthesized paragraph 1: woon-, gezin- en sociale context. Max 4 sentences, ~35-50 words. Null when no relevant intake info.'
    ),
    alinea_2: nullableStringProperty(
      'Synthesized paragraph 2: huishouden, zorg, dagstructuur, buitenshuis. Max 4 sentences, ~35-50 words. Null when no relevant intake info.'
    ),
    alinea_3: nullableStringProperty(
      'Synthesized paragraph 3: vrije tijd, hobby\'s, sport, vrijwilligerswerk. Max 3 sentences, ~25-40 words. Null when no relevant intake info.'
    ),
  },
  required: ['alinea_1', 'alinea_2', 'alinea_3'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function parseSocialeAchtergrondContentResult(raw: unknown): SocialeAchtergrondContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    alinea_1: coerceNullableString(o.alinea_1),
    alinea_2: coerceNullableString(o.alinea_2),
    alinea_3: coerceNullableString(o.alinea_3),
  };
}
