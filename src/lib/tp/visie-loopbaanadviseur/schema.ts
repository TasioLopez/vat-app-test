import { EN_SOORTGELIJK, FUNCTIE_SUGGESTION_BATCH_SIZE } from './constants';

export type FunctieAnker = 'opleiding' | 'werkervaring' | 'zoekprofiel';

export const FUNCTIE_ANKER_VALUES: readonly FunctieAnker[] = [
  'opleiding',
  'werkervaring',
  'zoekprofiel',
] as const;

export type VisieLoopbaanFunctie = {
  naam: string;
  toelichting: string;
  /** Profile bridge for generation/quality; omitted from published bullets. */
  anker?: FunctieAnker;
  anker_detail?: string;
};

export type VisieLoopbaanadviseurContentResult = {
  functies: VisieLoopbaanFunctie[];
};

const functieSchema = {
  type: 'object' as const,
  properties: {
    naam: {
      type: 'string' as const,
      description:
        'Short common Dutch vacancy title (max ~1-2 modifiers); distinct from other suggestions',
    },
    toelichting: {
      type: 'string' as const,
      description:
        'Max one sentence: why passend — must reference the anker (opleiding/ervaring/zoekprofiel), not only belastbaarheid',
    },
    anker: {
      type: 'string' as const,
      enum: ['opleiding', 'werkervaring', 'zoekprofiel'],
      description: 'Which dossier bridge this title builds on',
    },
    anker_detail: {
      type: 'string' as const,
      description: 'Short concrete detail from dossier (opleiding, job, or zoekrichting)',
    },
  },
  required: ['naam', 'toelichting', 'anker', 'anker_detail'] as const,
  additionalProperties: false,
};

/** Suggestion-round schema: exactly FUNCTIE_SUGGESTION_BATCH_SIZE new candidates. */
export const VISIE_LOOPBAANADVISEUR_SUGGESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    functies: {
      type: 'array',
      description: `Exactly ${FUNCTIE_SUGGESTION_BATCH_SIZE} concrete NEW common NL functions with profile anker. No AD/kept/rejected synonyms. Not niche inventions.`,
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

function coerceAnker(value: unknown): FunctieAnker | undefined {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'opleiding' || raw === 'werkervaring' || raw === 'zoekprofiel') {
    return raw;
  }
  return undefined;
}

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
      const anker = coerceAnker(o.anker);
      const anker_detail = String(o.anker_detail ?? '').trim();
      return {
        naam,
        toelichting,
        ...(anker ? { anker } : {}),
        ...(anker_detail ? { anker_detail } : {}),
      };
    })
    .filter((f): f is VisieLoopbaanFunctie => f != null);

  if (maxItems != null) return mapped.slice(0, maxItems);
  return mapped;
}

/** Drop generation-only anker fields before publishing bullets. */
export function toPublishedFuncties(
  functies: VisieLoopbaanFunctie[]
): Array<{ naam: string; toelichting: string }> {
  return functies.map((f) => ({
    naam: f.naam,
    toelichting: f.toelichting,
  }));
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
