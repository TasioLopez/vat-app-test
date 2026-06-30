export type SpreekuurContentResult = {
  datum: string | null;
  arts_org: string | null;
  rubrieken: string[];
  prognose_citaat: string | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const SPREEKUUR_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    datum: nullableStringProperty(
      'Documentdatum of spreekuurdatum in YYYY-MM-DD. Null if not found.'
    ),
    arts_org: nullableStringProperty(
      'Naam bedrijfsarts/verzekeringsarts inclusief supervisie-zin indien aanwezig. Null if not found.'
    ),
    rubrieken: {
      type: 'array',
      description:
        'FML-rubrieken met daadwerkelijke beperkingen genoemd in de Spreekuurrapportage',
      items: { type: 'string' },
    },
    prognose_citaat: nullableStringProperty(
      'Exact letterlijk citaat van de prognose uit de Spreekuurrapportage. Null if not found.'
    ),
  },
  required: ['datum', 'arts_org', 'rubrieken', 'prognose_citaat'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function coerceRubrieken(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export function parseSpreekuurContentResult(raw: unknown): SpreekuurContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    datum: coerceNullableString(o.datum),
    arts_org: coerceNullableString(o.arts_org),
    rubrieken: coerceRubrieken(o.rubrieken),
    prognose_citaat: coerceNullableString(o.prognose_citaat),
  };
}

export function hasSpreekuurContent(result: SpreekuurContentResult | null | undefined): boolean {
  if (!result) return false;
  return Boolean(
    result.datum ||
      result.arts_org ||
      result.rubrieken.length > 0 ||
      result.prognose_citaat
  );
}
