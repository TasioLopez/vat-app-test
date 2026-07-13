export type AdAdviesContentResult = {
  ad_auteur: string | null;
  ad_datum_iso: string | null;
  advies_citaat: string | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const AD_ADVIES_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ad_auteur: nullableStringProperty(
      'Naam arbeidsdeskundige from intake Sectie 7 (fallback Sectie 6 Naam AD). Null if not found.'
    ),
    ad_datum_iso: nullableStringProperty(
      'Datum AD-rapport from intake Sectie 6 in YYYY-MM-DD. Null if not found.'
    ),
    advies_citaat: nullableStringProperty(
      'EXACT verbatim Quote passende functies from intake Sectie 7. Exclude Quote advies spoor 2. Null if not found.'
    ),
  },
  required: ['ad_auteur', 'ad_datum_iso', 'advies_citaat'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function parseAdAdviesContentResult(raw: unknown): AdAdviesContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    ad_auteur: coerceNullableString(o.ad_auteur),
    ad_datum_iso: coerceNullableString(o.ad_datum_iso),
    advies_citaat: coerceNullableString(o.advies_citaat),
  };
}
