/** Structured content: synthesized alinea 1/3/4 + metadata for server-built alinea 2. */
export type ZoekprofielContentResult = {
  alinea_1: string | null;
  alinea_3: string | null;
  alinea_4: string | null;
  heeft_fysieke_beperkingen: boolean;
  belastbaarheidsdocument_type: 'fml' | 'izp';
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
    alinea_1: nullableStringProperty(
      'Paragraph 1: werkervaring, functienamen (no werkgevers), opleiding, werk-/denkniveau, zoekrichting; must include exactly one niveau sentence. Max 6 sentences.'
    ),
    alinea_3: nullableStringProperty(
      'Paragraph 3: mental and social load capacity from FML/IZP translated to arbeidskundige taal. Max 5 sentences. Null when none.'
    ),
    alinea_4: nullableStringProperty(
      'Paragraph 4: physical limitations in arbeidskundige taal, no body parts. Null when none or heeft_fysieke_beperkingen is false.'
    ),
    heeft_fysieke_beperkingen: {
      type: 'boolean',
      description:
        'True when FML/IZP contains arbeidsrelevante fysieke beperkingen that must appear in alinea_4.',
    },
    belastbaarheidsdocument_type: {
      type: 'string',
      enum: ['fml', 'izp'],
      description:
        'Detect from uploaded belastbaarheidsdocument: fml for Functionele Mogelijkheden Lijst, izp for Inzetbaarheidsprofiel.',
    },
    belastbaarheidsdocument_datum_voluit: nullableStringProperty(
      'Full Dutch date from belastbaarheidsdocument (e.g. "12 december 2025"). Null if not found in document.'
    ),
  },
  required: [
    'alinea_1',
    'alinea_3',
    'alinea_4',
    'heeft_fysieke_beperkingen',
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

function coerceBelastbaarheidsdocumentType(value: unknown): 'fml' | 'izp' {
  const t = String(value || '').toLowerCase();
  return t === 'izp' ? 'izp' : 'fml';
}

export function parseZoekprofielContentResult(raw: unknown): ZoekprofielContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    alinea_1: coerceNullableString(o.alinea_1),
    alinea_3: coerceNullableString(o.alinea_3),
    alinea_4: coerceNullableString(o.alinea_4),
    heeft_fysieke_beperkingen: Boolean(o.heeft_fysieke_beperkingen),
    belastbaarheidsdocument_type: coerceBelastbaarheidsdocumentType(
      o.belastbaarheidsdocument_type
    ),
    belastbaarheidsdocument_datum_voluit: coerceNullableString(
      o.belastbaarheidsdocument_datum_voluit
    ),
  };
}
