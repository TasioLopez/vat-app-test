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
      'Naam van de arbeidsdeskundige auteur uit het AD-rapport. Null if not found.'
    ),
    ad_datum_iso: nullableStringProperty(
      'Datum van het AD-rapport in ISO-formaat (YYYY-MM-DD). Null if not found.'
    ),
    advies_citaat: nullableStringProperty(
      'EXACT letterlijk hoofdadvies-paragraaf uit het AD-rapport over passende arbeid / 2e spoor. Exclude passend-werk definitie and job examples. Null if not found.'
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
