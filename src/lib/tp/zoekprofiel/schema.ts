import type { BelastbaarheidsdocumentType } from './constants';

/** Structured content: V1.3 two-paragraph zoekprofiel + metadata for server-built closing. */
export type ZoekprofielContentResult = {
  verduidelijkingsvraag: string | null;
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
    verduidelijkingsvraag: nullableStringProperty(
      'Targeted Dutch clarification question when sources are insufficient, education is not demonstrably completed, or sources conflict. Null when zoekprofiel can be written. When set, alinea_1_kern and alinea_2 must be null.'
    ),
    alinea_1_kern: nullableStringProperty(
      'Paragraph 1 body WITHOUT closing sentence: must start with mandatory V1.3 opening ("Op basis van de afgeronde opleiding(en)..."); then highest completed education only, optional explicit werk-/denkniveau, work experience (functions/sectors/environments only). No lists or headings. Null when verduidelijkingsvraag is set.'
    ),
    alinea_2: nullableStringProperty(
      'Paragraph 2: flowing positive arbeidskundige translation of only afwijkend gescoorde limitations from the leading Functionele Mogelijkheden Lijst / Inzetbaarheidsprofiel / Lijst arbeidsmogelijkheden en beperkingen. Rubrics: persoonlijk functioneren, sociaal functioneren, fysieke omgevingseisen, dynamische handelingen, statische houdingen, werktijden, overige. Skip normal scores. No body parts (schouderhoogte exception only). No lists. Null when verduidelijkingsvraag is set.'
    ),
    belastbaarheidsdocument_type: {
      type: 'string',
      enum: ['fml', 'izp', 'lab'],
      description:
        'Type of most recent / leading belastbaarheidsdocument: fml, izp, or lab.',
    },
    belastbaarheidsdocument_datum_voluit: nullableStringProperty(
      'Full Dutch date from most recent belastbaarheidsdocument (e.g. "19 januari 2026"). Null if not found.'
    ),
  },
  required: [
    'verduidelijkingsvraag',
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
  let verduidelijkingsvraag = coerceNullableString(o.verduidelijkingsvraag);
  let alinea_1_kern = coerceNullableString(o.alinea_1_kern);
  let alinea_2 = coerceNullableString(o.alinea_2);

  // Mutual exclusivity: clarification vs content
  if (verduidelijkingsvraag && (alinea_1_kern || alinea_2)) {
    console.warn(
      '⚠️ Zoekprofiel: verduidelijkingsvraag gezet terwijl alinea-inhoud aanwezig is — inhoud genegeerd'
    );
    alinea_1_kern = null;
    alinea_2 = null;
  }

  return {
    verduidelijkingsvraag,
    alinea_1_kern,
    alinea_2,
    belastbaarheidsdocument_type: coerceBelastbaarheidsdocumentType(
      o.belastbaarheidsdocument_type
    ),
    belastbaarheidsdocument_datum_voluit: coerceNullableString(
      o.belastbaarheidsdocument_datum_voluit
    ),
  };
}
