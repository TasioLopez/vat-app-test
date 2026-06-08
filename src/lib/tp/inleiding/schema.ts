export type MedischeBegeleiding = 'actief' | 'afgerond' | 'toekomstig' | 'geen';

export type ReintegratieWerkType = 'eigen werk' | 'aangepast werk' | 'deels aangepast werk';

export type ExtraAanmelder = {
  functie: string;
  naam: string;
  organisatie: string;
};

/** Structured content returned by the model (no layout/formatting). */
export type InleidingContentResult = {
  functieomschrijving: string;
  medische_begeleiding: MedischeBegeleiding;
  reintegreert_spoor1: boolean;
  reintegratie_uren: string | null;
  reintegratie_werk_type: ReintegratieWerkType | null;
  werknemer_doel_toelichting: string | null;
  ad_quote: string | null;
  extra_aanmelder: ExtraAanmelder | null;
};

/** JSON schema for OpenAI Structured Outputs (strict). */
export const INLEIDING_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    functieomschrijving: {
      type: 'string',
      description:
        'Body of the job description only: narrative, max 4 sentences, no heading, no bullet list.',
    },
    medische_begeleiding: {
      type: 'string',
      enum: ['actief', 'afgerond', 'toekomstig', 'geen'],
      description:
        'Treatment status: actief=ongoing care, afgerond=past care, toekomstig=planned, geen=no treatment.',
    },
    reintegreert_spoor1: {
      type: 'boolean',
      description: 'True if worker is re-integrating in spoor 1 at intake.',
    },
    reintegratie_uren: {
      type: ['string', 'null'],
      description: 'Hours per week in spoor 1 when reintegreert_spoor1 is true, e.g. "8".',
    },
    reintegratie_werk_type: {
      type: ['string', 'null'],
      enum: ['eigen werk', 'aangepast werk', 'deels aangepast werk', null],
      description: 'Type of spoor 1 work when reintegreert_spoor1 is true.',
    },
    werknemer_doel_toelichting: {
      type: ['string', 'null'],
      description:
        'Optional: if worker views the 2e spoor goal differently, brief clarification; otherwise null.',
    },
    ad_quote: {
      type: ['string', 'null'],
      description:
        'Literal quote from AD report conclusion/advice about 2e spoor; null when no AD document.',
    },
    extra_aanmelder: {
      type: ['object', 'null'],
      properties: {
        functie: { type: 'string' },
        naam: { type: 'string' },
        organisatie: { type: 'string' },
      },
      required: ['functie', 'naam', 'organisatie'],
      additionalProperties: false,
      description:
        'Extra referrer from intake section 4 if present; otherwise null.',
    },
  },
  required: [
    'functieomschrijving',
    'medische_begeleiding',
    'reintegreert_spoor1',
    'reintegratie_uren',
    'reintegratie_werk_type',
    'werknemer_doel_toelichting',
    'ad_quote',
    'extra_aanmelder',
  ],
  additionalProperties: false,
} as const;

export function parseInleidingContentResult(raw: unknown): InleidingContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const med = o.medische_begeleiding;
  const validMed =
    med === 'actief' || med === 'afgerond' || med === 'toekomstig' || med === 'geen'
      ? med
      : 'geen';

  let extra: ExtraAanmelder | null = null;
  if (o.extra_aanmelder && typeof o.extra_aanmelder === 'object') {
    const e = o.extra_aanmelder as Record<string, unknown>;
    if (e.functie && e.naam && e.organisatie) {
      extra = {
        functie: String(e.functie).trim(),
        naam: String(e.naam).trim(),
        organisatie: String(e.organisatie).trim(),
      };
    }
  }

  const werkType = o.reintegratie_werk_type;
  const validWerkType =
    werkType === 'eigen werk' ||
    werkType === 'aangepast werk' ||
    werkType === 'deels aangepast werk'
      ? werkType
      : null;

  return {
    functieomschrijving: String(o.functieomschrijving ?? '').trim(),
    medische_begeleiding: validMed,
    reintegreert_spoor1: Boolean(o.reintegreert_spoor1),
    reintegratie_uren: o.reintegratie_uren ? String(o.reintegratie_uren).trim() : null,
    reintegratie_werk_type: validWerkType,
    werknemer_doel_toelichting: o.werknemer_doel_toelichting
      ? String(o.werknemer_doel_toelichting).trim()
      : null,
    ad_quote: o.ad_quote ? String(o.ad_quote).trim() : null,
    extra_aanmelder: extra,
  };
}
