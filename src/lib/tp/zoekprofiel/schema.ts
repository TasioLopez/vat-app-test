import type {
  ActualisatieEntry,
  ActualisatieType,
  BelastbaarheidsdocumentType,
} from './constants';

/** Structured content: V3 two-paragraph zoekprofiel + metadata for server-built closing. */
export type ZoekprofielContentResult = {
  verduidelijkingsvraag: string | null;
  alinea_1_kern: string | null;
  alinea_2: string | null;
  opening_variant: 'singular' | 'plural' | null;
  belastbaarheidsdocument_type: BelastbaarheidsdocumentType;
  belastbaarheidsdocument_datum_voluit: string | null;
  actualisaties: ActualisatieEntry[] | null;
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
      'Targeted Dutch clarification question when sources are insufficient, education unclear, score/toelichting conflict, or sources contradict. Null when zoekprofiel can be written. When set, alinea_1_kern and alinea_2 must be null.'
    ),
    alinea_1_kern: nullableStringProperty(
      'Paragraph 1 WITHOUT closing or actualisatie clause (server adds those). Must start with V3 opening (hoogst afgeronde opleiding/en). Highest completed education only; arbeidsverleden from explicit werkervaring only. Null when verduidelijkingsvraag is set.'
    ),
    alinea_2: nullableStringProperty(
      'Paragraph 2: one flowing positive alinea translating afwijkende beperkingen and bijzondere voorwaarden from leading belastbaarheidsbron. Null when verduidelijkingsvraag is set.'
    ),
    opening_variant: {
      type: ['string', 'null'],
      enum: ['singular', 'plural', null],
      description:
        'singular when one highest education; plural when multiple at same highest niveau; null if unclear.',
    },
    belastbaarheidsdocument_type: {
      type: 'string',
      enum: ['fml', 'izp', 'lab', 'belastbaarheidsprofiel'],
      description:
        'Leading belastbaarheidsdocument: fml, izp, lab, or belastbaarheidsprofiel (e.g. spreekuur).',
    },
    belastbaarheidsdocument_datum_voluit: nullableStringProperty(
      'Full Dutch date from leading document (e.g. "14 april 2026"). Null if AD-only without separate belast doc date.'
    ),
    actualisaties: {
      type: ['array', 'null'],
      description:
        'Chronological content-relevant actualisaties from spreekuurrapportage or artsenverduidelijking. Null when none.',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['spreekuurrapportage', 'artsenverduidelijking'],
          },
          datum_voluit: {
            type: 'string',
            description: 'Full Dutch date voluit.',
          },
        },
        required: ['type', 'datum_voluit'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'verduidelijkingsvraag',
    'alinea_1_kern',
    'alinea_2',
    'opening_variant',
    'belastbaarheidsdocument_type',
    'belastbaarheidsdocument_datum_voluit',
    'actualisaties',
  ],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function coerceActualisatieType(value: unknown): ActualisatieType | null {
  const t = String(value || '').toLowerCase();
  if (t === 'artsenverduidelijking') return 'artsenverduidelijking';
  if (t === 'spreekuurrapportage') return 'spreekuurrapportage';
  return null;
}

function parseActualisaties(raw: unknown): ActualisatieEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const entries: ActualisatieEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const type = coerceActualisatieType(o.type);
    const datum = coerceNullableString(o.datum_voluit);
    if (type && datum) entries.push({ type, datum_voluit: datum });
  }
  return entries.length ? entries : null;
}

export function coerceBelastbaarheidsdocumentType(
  value: unknown
): BelastbaarheidsdocumentType {
  const t = String(value || '').toLowerCase();
  if (t === 'izp') return 'izp';
  if (t === 'lab') return 'lab';
  if (t === 'belastbaarheidsprofiel') return 'belastbaarheidsprofiel';
  return 'fml';
}

export function parseZoekprofielContentResult(raw: unknown): ZoekprofielContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let verduidelijkingsvraag = coerceNullableString(o.verduidelijkingsvraag);
  let alinea_1_kern = coerceNullableString(o.alinea_1_kern);
  let alinea_2 = coerceNullableString(o.alinea_2);

  if (verduidelijkingsvraag && (alinea_1_kern || alinea_2)) {
    console.warn(
      '⚠️ Zoekprofiel: verduidelijkingsvraag gezet terwijl alinea-inhoud aanwezig is — inhoud genegeerd'
    );
    alinea_1_kern = null;
    alinea_2 = null;
  }

  const openingRaw = coerceNullableString(o.opening_variant);
  const opening_variant =
    openingRaw === 'singular' || openingRaw === 'plural' ? openingRaw : null;

  return {
    verduidelijkingsvraag,
    alinea_1_kern,
    alinea_2,
    opening_variant,
    belastbaarheidsdocument_type: coerceBelastbaarheidsdocumentType(
      o.belastbaarheidsdocument_type
    ),
    belastbaarheidsdocument_datum_voluit: coerceNullableString(
      o.belastbaarheidsdocument_datum_voluit
    ),
    actualisaties: parseActualisaties(o.actualisaties),
  };
}
