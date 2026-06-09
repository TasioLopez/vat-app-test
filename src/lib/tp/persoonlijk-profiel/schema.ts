/** Structured content: up to three synthesized UWV-style paragraphs. */
export type PersoonlijkProfielContentResult = {
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
export const PERSOONLIJK_PROFIEL_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    alinea_1: nullableStringProperty(
      'Paragraph 1: mandatory opening sentence (leeftijd/geslacht from context, duur/functies from intake) + compact arbeidsverleden + opleiding/scholing + explicitly named skills only. Max 6 sentences, ~80-110 words.'
    ),
    alinea_2: nullableStringProperty(
      'Paragraph 2: mobiliteit, then talenkennis, then digitale vaardigheden incl. typvaardigheden. Max 5 sentences, ~60-80 words. Null when no relevant intake info.'
    ),
    alinea_3: nullableStringProperty(
      'Paragraph 3: objectively stated personality traits only (not self-descriptions). Max 3 sentences. Null when none in intake.'
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

export function parsePersoonlijkProfielContentResult(raw: unknown): PersoonlijkProfielContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    alinea_1: coerceNullableString(o.alinea_1),
    alinea_2: coerceNullableString(o.alinea_2),
    alinea_3: coerceNullableString(o.alinea_3),
  };
}
