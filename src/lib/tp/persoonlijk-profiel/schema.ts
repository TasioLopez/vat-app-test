/** Structured content: two synthesized UWV-style paragraphs; alinea_3 always null. */
export type PersoonlijkProfielContentResult = {
  alinea_1: string | null;
  alinea_2: string | null;
  /** Always null — personality/judgment is never autofilled. */
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
      'Paragraph 1: mandatory opening (leeftijd/geslacht from context, duur/functies from intake) + selective completed education only. No chronological timelines (sinds/tussen/year ranges), no interpretive education summaries. Max 6 sentences, ~80-110 words.'
    ),
    alinea_2: nullableStringProperty(
      'Paragraph 2: mobiliteit, then talenkennis (merge same levels; separate different levels), then digitale vaardigheden incl. typvaardigheden and named systems. Only facts stated in intake — never invent. Smartphone only if no PC/laptop stated. Max 5 sentences, ~60-80 words. Null when no relevant intake info.'
    ),
    alinea_3: nullableStringProperty(
      'Always null. Do not generate personality traits, judgment, motivation, or soft feedback. Users may add this manually later.'
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
    // Always null — never autofill judgment/personality content
    alinea_3: null,
  };
}
