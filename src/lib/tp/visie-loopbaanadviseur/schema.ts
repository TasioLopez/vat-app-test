import { EN_SOORTGELIJK, FUNCTIE_SUGGESTION_BATCH_SIZE } from './constants';

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
      description: 'Functienaam op de Nederlandse arbeidsmarkt; distinct from other suggestions',
    },
    toelichting: {
      type: 'string' as const,
      description: 'Max one sentence why passend within belastbaarheid',
    },
  },
  required: ['naam', 'toelichting'] as const,
  additionalProperties: false,
};

/** Suggestion-round schema: exactly FUNCTIE_SUGGESTION_BATCH_SIZE new candidates. */
export const VISIE_LOOPBAANADVISEUR_SUGGESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    functies: {
      type: 'array',
      description: `Exactly ${FUNCTIE_SUGGESTION_BATCH_SIZE} concrete NEW functions. No AD/kept/rejected synonyms. Conservative belastbaarheid check. Do not include "En soortgelijk".`,
      items: functieSchema,
      minItems: FUNCTIE_SUGGESTION_BATCH_SIZE,
      maxItems: FUNCTIE_SUGGESTION_BATCH_SIZE,
    },
  },
  required: ['functies'],
  additionalProperties: false,
} as const;

/** @deprecated Prefer VISIE_LOOPBAANADVISEUR_SUGGESTION_JSON_SCHEMA; kept for callers expecting this name. */
export const VISIE_LOOPBAANADVISEUR_CONTENT_JSON_SCHEMA =
  VISIE_LOOPBAANADVISEUR_SUGGESTION_JSON_SCHEMA;

function coerceFuncties(value: unknown, maxItems?: number): VisieLoopbaanFunctie[] {
  if (!Array.isArray(value)) return [];
  const mapped = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const naam = String(o.naam ?? '').trim();
      const toelichting = String(o.toelichting ?? '').trim();
      if (!naam) return null;
      if (naam.toLowerCase() === EN_SOORTGELIJK.toLowerCase()) return null;
      return { naam, toelichting };
    })
    .filter((f): f is VisieLoopbaanFunctie => f != null);

  if (maxItems != null) return mapped.slice(0, maxItems);
  return mapped;
}

export function parseVisieLoopbaanadviseurContentResult(
  raw: unknown,
  options?: { maxItems?: number }
): VisieLoopbaanadviseurContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    functies: coerceFuncties(o.functies, options?.maxItems),
  };
}

export function parseVisieLoopbaanadviseurSuggestionResult(
  raw: unknown
): VisieLoopbaanadviseurContentResult {
  return parseVisieLoopbaanadviseurContentResult(raw, {
    maxItems: FUNCTIE_SUGGESTION_BATCH_SIZE,
  });
}
