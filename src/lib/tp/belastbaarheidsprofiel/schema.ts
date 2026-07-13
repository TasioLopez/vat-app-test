export type SpreekuurMeta = {
  datum: string | null;
  arts_org: string | null;
};

export type BelastbaarheidsprofielContentResult = {
  rubrieken: string[];
  /** Populated server-side from intake Sectie 5, not from FML/AD/spreekuur AI extraction. */
  prognose_citaat: string | null;
  spreekuur_meta: SpreekuurMeta | null;
};

export const BELASTBAARHEID_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    rubrieken: {
      type: 'array',
      description:
        'FML rubrieken met daadwerkelijke beperkingen (exacte categorienamen uit FML/AD/intake checkboxes). Fallback wanneer geen Spreekuurrapportage.',
      items: { type: 'string' },
    },
  },
  required: ['rubrieken'],
  additionalProperties: false,
} as const;


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
    prognose_citaat: null,
    spreekuur_meta: spreekuurMeta,
  };
}
