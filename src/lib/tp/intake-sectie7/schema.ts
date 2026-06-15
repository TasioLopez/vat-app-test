export type IntakeSectie7FunctieCategorie = {
  naam: string;
  toelichting: string;
};

export type IntakeSectie7Content = {
  ad_auteur: string | null;
  ad_datum_iso: string | null;
  quote_advies_spoor2: string | null;
  functie_categorien: IntakeSectie7FunctieCategorie[];
};

const functieCategorieSchema = {
  type: 'object' as const,
  properties: {
    naam: {
      type: 'string' as const,
      description: 'Category label verbatim from intake (e.g. Computergericht/Administratief)',
    },
    toelichting: {
      type: 'string' as const,
      description: 'Verbatim "Zoals:" examples or trailing text for this category',
    },
  },
  required: ['naam', 'toelichting'] as const,
  additionalProperties: false,
};

function nullableStringProperty(description: string) {
  return {
    type: ['string', 'null'] as const,
    description,
  };
}

export const INTAKE_SECTIE7_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ad_auteur: nullableStringProperty(
      'Naam arbeidsdeskundige from Sectie 7, fallback Sectie 6 Naam AD. Null if not found.'
    ),
    ad_datum_iso: nullableStringProperty(
      'Datum AD-rapport from Sectie 6 in YYYY-MM-DD. Null if not found.'
    ),
    quote_advies_spoor2: nullableStringProperty(
      'EXACT verbatim advice paragraph from Sectie 7 Quote advies spoor 2. Exclude Quote passende functies. Null if not found.'
    ),
    functie_categorien: {
      type: 'array',
      description:
        'Categories parsed verbatim from Sectie 7 Quote passende functies. Empty array if not found.',
      items: functieCategorieSchema,
    },
  },
  required: ['ad_auteur', 'ad_datum_iso', 'quote_advies_spoor2', 'functie_categorien'],
  additionalProperties: false,
} as const;

function coerceNullableString(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function coerceFunctieCategorien(value: unknown): IntakeSectie7FunctieCategorie[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const naam = String(o.naam ?? '').trim();
      if (!naam) return null;
      return { naam, toelichting: String(o.toelichting ?? '').trim() };
    })
    .filter((c): c is IntakeSectie7FunctieCategorie => c != null);
}

export function parseIntakeSectie7Content(raw: unknown): IntakeSectie7Content {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    ad_auteur: coerceNullableString(o.ad_auteur),
    ad_datum_iso: coerceNullableString(o.ad_datum_iso),
    quote_advies_spoor2: coerceNullableString(o.quote_advies_spoor2),
    functie_categorien: coerceFunctieCategorien(o.functie_categorien),
  };
}
