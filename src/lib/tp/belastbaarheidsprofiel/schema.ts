export type SpreekuurMeta = {
  datum: string | null;
  arts_org: string | null;
};

export type BelastbaarheidsprofielContentResult = {
  rubrieken: string[];
  prognose_citaat: string | null;
  reintegratieadvies_citaat: string | null;
  spreekuur_meta: SpreekuurMeta | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const BELASTBAARHEID_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    rubrieken: {
      type: 'array',
      description:
        'FML rubrieken met daadwerkelijke beperkingen (exacte categorienamen uit FML/AD). Fallback wanneer geen Spreekuurrapportage.',
      items: { type: 'string' },
    },
    prognose_citaat: nullableStringProperty(
      'Exact letterlijk citaat van de prognose uit FML/AD/medisch spreekuur. Fallback wanneer geen Spreekuurrapportage. Null if not found.'
    ),
    reintegratieadvies_citaat: nullableStringProperty(
      'Exact letterlijk citaat van het re-integratieadvies uit AD-rapport. NOOIT uit Spreekuurrapportage. Null if not found.'
    ),
  },
  required: ['rubrieken', 'prognose_citaat', 'reintegratieadvies_citaat'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function coerceRubrieken(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

export function parseBelastbaarheidsprofielContentResult(
  raw: unknown,
  spreekuurMeta: SpreekuurMeta | null = null
): BelastbaarheidsprofielContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    rubrieken: coerceRubrieken(o.rubrieken),
    prognose_citaat: coerceNullableString(o.prognose_citaat),
    reintegratieadvies_citaat: coerceNullableString(o.reintegratieadvies_citaat),
    spreekuur_meta: spreekuurMeta,
  };
}
