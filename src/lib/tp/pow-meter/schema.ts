import type { TredeNumber } from './constants';

/** Structured content from model: trede numbers + kernels for server assembly. */
export type PowMeterContentResult = {
  huidige_trede_nummer: TredeNumber;
  huidige_werkzame_uren: string;
  verwachting_trede_nummer: TredeNumber;
  verwachting_kern: string;
  toelichting_kern: string;
};

/** Assembled final text after server-built openers. */
export type AssembledPowMeterContent = {
  huidige_trede_tekst: string;
  huidige_werkzame_uren: string;
  verwachting_3_maanden: string;
  toelichting_pow: string;
};

export const POW_METER_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    huidige_trede_nummer: {
      type: 'integer',
      enum: [1, 2, 3, 4, 5, 6],
      description: 'Current POW-meter trede (1-6) from decision tree.',
    },
    huidige_werkzame_uren: {
      type: 'string',
      description:
        'Max 2 sentences. Current weekly hours, contract ratio, adapted/unpaid work, employer, Spoor 1/2, role if known. No trajectory explanation.',
    },
    verwachting_trede_nummer: {
      type: 'integer',
      enum: [1, 2, 3, 4, 5, 6],
      description: 'Expected trede in 3 months.',
    },
    verwachting_kern: {
      type: 'string',
      description:
        'Body AFTER the verwachting opener (do not include opener). Max ~80 words total with opener. Include exact Spoor 2 block only when logically supported.',
    },
    toelichting_kern: {
      type: 'string',
      description:
        'Continues after "omdat" (do not repeat opener). Max ~120 words total with opener. Underpin trede, hours, contract, spoor, participation, motivation.',
    },
  },
  required: [
    'huidige_trede_nummer',
    'huidige_werkzame_uren',
    'verwachting_trede_nummer',
    'verwachting_kern',
    'toelichting_kern',
  ],
  additionalProperties: false,
} as const;

function coerceString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function coerceTredeNumber(value: unknown): TredeNumber {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    console.warn('⚠️ POW-meter: invalid trede number, defaulting to 1');
    return 1;
  }
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 6) {
    console.warn(`⚠️ POW-meter: trede ${rounded} out of range, clamping to 1-6`);
    return Math.min(6, Math.max(1, rounded)) as TredeNumber;
  }
  return rounded as TredeNumber;
}

export function parsePowMeterContentResult(raw: unknown): PowMeterContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    huidige_trede_nummer: coerceTredeNumber(o.huidige_trede_nummer),
    huidige_werkzame_uren: coerceString(o.huidige_werkzame_uren),
    verwachting_trede_nummer: coerceTredeNumber(o.verwachting_trede_nummer),
    verwachting_kern: coerceString(o.verwachting_kern),
    toelichting_kern: coerceString(o.toelichting_kern),
  };
}
