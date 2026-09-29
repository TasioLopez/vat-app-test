import { STANDARD_RUBRIEKEN } from '@/lib/tp/belastbaarheidsprofiel/constants';

export type IntakeSectie5Content = {
  quote_prognose_advies_belastbaarheid: string | null;
  /** Checked FML/IZP-beperkingen from intake Sectie 5, using STANDARD_RUBRIEKEN labels. */
  rubrieken: string[];
};

const STANDARD_RUBRIEK_LOOKUP = new Map(
  STANDARD_RUBRIEKEN.map((label) => [label.toLowerCase(), label])
);

/** Normalize common intake checkbox wording to STANDARD_RUBRIEKEN labels. */
const RUBRIEK_ALIASES: Record<string, (typeof STANDARD_RUBRIEKEN)[number]> = {
  'persoonlijk functioneren': 'Persoonlijk functioneren',
  'sociaal functioneren': 'Sociaal functioneren',
  'dynamische handelingen': 'Dynamische handelingen',
  'statische houdingen': 'Statische houdingen',
  'aanpassing aan fysieke omgevingseisen': 'Aanpassing aan fysieke omgevingseisen',
  'aanpassingen fysieke omgevingseisen': 'Aanpassing aan fysieke omgevingseisen',
  'aanpassingen aan fysieke omgevingseisen': 'Aanpassing aan fysieke omgevingseisen',
  werktijden: 'Werktijden',
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const INTAKE_SECTIE5_JSON_SCHEMA = {
  type: 'object',
  properties: {
    quote_prognose_advies_belastbaarheid: nullableStringProperty(
      'EXACT verbatim text from Sectie 5 under "Quote prognose en quote advies belastbaarheid (bedrijfsarts):". Null if not found.'
    ),
    rubrieken: {
      type: 'array',
      description:
        'Checked FML/IZP-beperkingen from intake Sectie 5. Use exact standard category names only.',
      items: { type: 'string' },
    },
  },
  required: ['quote_prognose_advies_belastbaarheid', 'rubrieken'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function normalizeIntakeRubrieken(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const raw = String(item).trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const label =
      RUBRIEK_ALIASES[key] ?? STANDARD_RUBRIEK_LOOKUP.get(key) ?? null;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }

  return result;
}

export function parseIntakeSectie5Content(raw: unknown): IntakeSectie5Content {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    quote_prognose_advies_belastbaarheid: coerceNullableString(
      o.quote_prognose_advies_belastbaarheid
    ),
    rubrieken: normalizeIntakeRubrieken(o.rubrieken),
  };
}
