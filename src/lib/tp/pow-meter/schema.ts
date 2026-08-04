import { MAX_VERWACHTING_JUMP, type TredeNumber } from './constants';

/** Structured content after parse — model tredes + texts for server assembly. */
export type PowMeterContentResult = {
  huidige_trede_nummer: TredeNumber;
  has_werkzame_uren: boolean;
  huidige_werkzame_uren: string;
  verwachting_trede_nummer: TredeNumber;
  visie_op_plaatsbaarheid: string;
  controlepunt: string;
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
      description:
        'Current POW-meter trede (1–6) under V11 hour/activity rubric. Check trede 6 before 5.',
    },
    has_werkzame_uren: {
      type: 'boolean',
      description:
        'true when employee has work / re-integration / activation hours. Household/social/leisure alone = false.',
    },
    huidige_werkzame_uren: {
      type: 'string',
      description:
        'Full sentence when has_werkzame_uren=true: "Werknemer verricht momenteel …". Empty string when has_werkzame_uren=false.',
    },
    verwachting_trede_nummer: {
      type: 'integer',
      enum: [1, 2, 3, 4, 5, 6],
      description:
        'Expected trede in 3 months. Normally at most +1 vs current; no growth if unsupported. Server builds the single sentence.',
    },
    visie_op_plaatsbaarheid: {
      type: 'string',
      description:
        'Full visie paragraph: huidige trede underbouwing, doel verwachte trede, passende vervolgstap, korte slotzin. Use hij/zij/werknemer.',
    },
    controlepunt: {
      type: 'string',
      description:
        'Max one concrete check question when essential info missing and trede could change; otherwise empty string.',
    },
  },
  required: [
    'huidige_trede_nummer',
    'has_werkzame_uren',
    'huidige_werkzame_uren',
    'verwachting_trede_nummer',
    'visie_op_plaatsbaarheid',
    'controlepunt',
  ],
  additionalProperties: false,
} as const;

function coerceString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function coerceBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === 'ja' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'nee' || lower === 'no' || lower === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
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

/**
 * Cap model verwachting so it stays plausible vs huidige trede (V11: normally max +1).
 */
export function capVerwachtingTrede(
  huidige: TredeNumber,
  modelVerwachting: TredeNumber,
  maxJump: number = MAX_VERWACHTING_JUMP
): TredeNumber {
  let capped = Math.min(modelVerwachting, huidige + maxJump) as TredeNumber;

  if (capped < huidige) {
    capped = huidige;
  }

  if (capped !== modelVerwachting) {
    console.warn(
      `⚠️ POW-meter: verwachting_trede ${modelVerwachting} → ${capped} (huidige=${huidige}, maxJump=${maxJump})`
    );
  }

  return capped;
}

export function parsePowMeterContentResult(raw: unknown): PowMeterContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const huidige_trede_nummer = coerceTredeNumber(o.huidige_trede_nummer);
  const rawVerwachting = coerceTredeNumber(o.verwachting_trede_nummer);
  const verwachting_trede_nummer = capVerwachtingTrede(huidige_trede_nummer, rawVerwachting);

  const has_werkzame_uren = coerceBoolean(o.has_werkzame_uren);
  let huidige_werkzame_uren = coerceString(o.huidige_werkzame_uren);
  if (!has_werkzame_uren) {
    huidige_werkzame_uren = '';
  }

  return {
    huidige_trede_nummer,
    has_werkzame_uren,
    huidige_werkzame_uren,
    verwachting_trede_nummer,
    visie_op_plaatsbaarheid: coerceString(o.visie_op_plaatsbaarheid),
    controlepunt: coerceString(o.controlepunt),
  };
}
