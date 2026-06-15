export type VisieLoopbaanFunctie = {
  naam: string;
  toelichting: string;
};

export type VisieLoopbaanadviseurContentResult = {
  functies: VisieLoopbaanFunctie[];
  ad_functies_bekend: boolean;
};

const functieSchema = {
  type: 'object' as const,
  properties: {
    naam: { type: 'string' as const, description: 'Functienaam' },
    toelichting: {
      type: 'string' as const,
      description: 'Korte toelichting in één zin waarom passend of onder welke voorwaarden',
    },
  },
  required: ['naam', 'toelichting'] as const,
  additionalProperties: false,
};

export const VISIE_LOOPBAANADVISEUR_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    functies: {
      type: 'array',
      description: 'Exact vier mogelijk passende functies (vierde mag "En soortgelijk" zijn)',
      items: functieSchema,
      minItems: 4,
      maxItems: 4,
    },
    ad_functies_bekend: {
      type: 'boolean',
      description:
        'True wanneer in AD-rapport of intake al passende functies genoemd zijn (gebruik AD-intro variant)',
    },
  },
  required: ['functies', 'ad_functies_bekend'],
  additionalProperties: false,
} as const;

function coerceFuncties(value: unknown): VisieLoopbaanFunctie[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const naam = String(o.naam ?? '').trim();
      const toelichting = String(o.toelichting ?? '').trim();
      if (!naam) return null;
      return { naam, toelichting };
    })
    .filter((f): f is VisieLoopbaanFunctie => f != null);
}

export function parseVisieLoopbaanadviseurContentResult(
  raw: unknown
): VisieLoopbaanadviseurContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const functies = coerceFuncties(o.functies);
  return {
    functies,
    ad_functies_bekend: Boolean(o.ad_functies_bekend),
  };
}
