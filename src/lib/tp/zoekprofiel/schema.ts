import type { BelastbaarheidsdocumentType } from './constants';

/** Structured content: V2 two-paragraph zoekprofiel + metadata for server-built closing. */
export type ZoekprofielContentResult = {
  alinea_1_kern: string | null;
  alinea_2: string | null;
  belastbaarheidsdocument_type: BelastbaarheidsdocumentType;
  belastbaarheidsdocument_datum_voluit: string | null;
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

/** JSON schema for OpenAI Structured Outputs (strict). */
export const ZOEKPROFIEL_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    alinea_1_kern: nullableStringProperty(
      'Paragraph 1 body WITHOUT closing sentence: must start with mandatory V2 opening ("Op basis van de afgeronde opleiding(en)..."); then highest education, optional explicit werk-/denkniveau, work experience (functions/sectors/environments only). No lists or headings.'
    ),
    alinea_2: nullableStringProperty(
      'Paragraph 2: full positive arbeidskundige translation of all relevant limitations from most recent FML/IZP/LAB (personal, social, dynamic load, static postures, environment, working hours). No body parts. No lists.'
    ),
    belastbaarheidsdocument_type: {
      type: 'string',
      enum: ['fml', 'izp', 'lab'],
      description:
        'Type of most recent belastbaarheidsdocument: fml, izp, or lab.',
    },
    belastbaarheidsdocument_datum_voluit: nullableStringProperty(
      'Full Dutch date from most recent belastbaarheidsdocument (e.g. "19 januari 2026"). Null if not found.'
    ),
  },
  required: [
    'alinea_1_kern',
    'alinea_2',
    'belastbaarheidsdocument_type',
    'belastbaarheidsdocument_datum_voluit',
  ],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

export function coerceBelastbaarheidsdocumentType(
  value: unknown
): BelastbaarheidsdocumentType {
  const t = String(value || '').toLowerCase();
  if (t === 'izp') return 'izp';
  if (t === 'lab') return 'lab';
  return 'fml';
}

export function parseZoekprofielContentResult(raw: unknown): ZoekprofielContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    alinea_1_kern: coerceNullableString(o.alinea_1_kern),
    alinea_2: coerceNullableString(o.alinea_2),
    belastbaarheidsdocument_type: coerceBelastbaarheidsdocumentType(
      o.belastbaarheidsdocument_type
    ),
    belastbaarheidsdocument_datum_voluit: coerceNullableString(
      o.belastbaarheidsdocument_datum_voluit
    ),
  };
}
