export type IntakeSectie3Content = {
  korte_beschrijving_werkzaamheden: string | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const INTAKE_SECTIE3_JSON_SCHEMA = {
  type: 'object',
  properties: {
    korte_beschrijving_werkzaamheden: nullableStringProperty(
      'EXACT verbatim text from Sectie 3 under "Korte beschrijving van de werkzaamheden:". Exclude the field label itself (even when no space after ":") and exclude section header "3. Functiebeschrijving". Null if not found or empty.'
    ),
  },
  required: ['korte_beschrijving_werkzaamheden'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function parseIntakeSectie3Content(raw: unknown): IntakeSectie3Content {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    korte_beschrijving_werkzaamheden: coerceNullableString(o.korte_beschrijving_werkzaamheden),
  };
}
