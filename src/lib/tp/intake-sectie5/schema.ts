export type IntakeSectie5Content = {
  quote_prognose_advies_belastbaarheid: string | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const INTAKE_SECTIE5_JSON_SCHEMA = {
  type: 'object',
  properties: {
    quote_prognose_advies_belastbaarheid: nullableStringProperty(
      'EXACT verbatim text from Sectie 5 under "Quote prognose en quote advies belastbaarheid (bedrijfsarts):". Null if not found.'
    ),
  },
  required: ['quote_prognose_advies_belastbaarheid'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function parseIntakeSectie5Content(raw: unknown): IntakeSectie5Content {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    quote_prognose_advies_belastbaarheid: coerceNullableString(o.quote_prognose_advies_belastbaarheid),
  };
}
