import { EN_SOORTGELIJK } from './constants';

export type VisieLoopbaanFunctie = {
  naam: string;
  toelichting: string;
};

export type VisieLoopbaanadviseurContentResult = {
  functies: VisieLoopbaanFunctie[];
};

const functieSchema = {
  type: 'object' as const,
  properties: {
    naam: {
      type: 'string' as const,
      description: 'Functienaam op de Nederlandse arbeidsmarkt; distinct from other three',
    },
    toelichting: {
      type: 'string' as const,
      description:
        'Max one sentence why passend within belastbaarheid. Empty string for fourth item En soortgelijk',
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
      description: `Exactly four functions. Fourth must be "${EN_SOORTGELIJK}" with empty toelichting. No AD synonyms. Conservative belastbaarheid check.`,
      items: functieSchema,
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ['functies'],
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
  return {
    functies: coerceFuncties(o.functies),
  };
}
