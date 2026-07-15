import type { TredeNumber } from './constants';
import { computeTredeFromLadder, type PowLadderAnswers } from './ladder';

/** Structured content after parse: ladder-computed trede + kernels for server assembly. */
export type PowMeterContentResult = {
  huidige_trede_nummer: TredeNumber;
  ladder: PowLadderAnswers;
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

const ladderBooleanProperty = (description: string) => ({
  type: 'boolean' as const,
  description,
});

export const POW_METER_CONTENT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    q1_duurzaam_benutbare_mogelijkheden: ladderBooleanProperty(
      'Vraag 1: Zijn er volgens de bedrijfsarts duurzaam benutbare mogelijkheden? true=Ja, false=Nee.'
    ),
    q2_minimaal_2x_buitenshuis: ladderBooleanProperty(
      'Vraag 2: Komt werknemer minimaal twee keer per week buitenshuis? true=Ja, false=Nee.'
    ),
    q3_regelmatige_sociale_participatie: ladderBooleanProperty(
      'Vraag 3: Is sprake van regelmatige sociale participatie buitenshuis? true=Ja, false=Nee.'
    ),
    q4_gemotiveerd_richting_arbeid: ladderBooleanProperty(
      'Vraag 4: Is werknemer gemotiveerd richting arbeid? true=Ja, false=Nee.'
    ),
    q5_belastbaar_min_12u: ladderBooleanProperty(
      'Vraag 5: Kan werknemer tijdens de intake ongeveer minimaal 12 uur per week belast worden? true=Ja, false=Nee.'
    ),
    q6_verricht_werkzaamheden: ladderBooleanProperty(
      'Vraag 6: Verricht werknemer momenteel werkzaamheden? true=Ja, false=Nee. 0 uur → false.'
    ),
    q7_betaald_werk: ladderBooleanProperty(
      'Vraag 7: Is sprake van betaald werk? true=Ja, false=Nee (vrijwilligerswerk/stage/WEP). Alleen relevant als q6 true.'
    ),
    q7_duurzaam_passend_min_65: ladderBooleanProperty(
      'Alleen bij betaald werk: duurzaam passend zonder tijdelijke voorzieningen en ≥~65% loonwaarde/contract → true (trede 6); anders false (trede 5).'
    ),
    huidige_werkzame_uren: {
      type: 'string',
      description:
        'Max 2 sentences. Current weekly hours, contract ratio, adapted/unpaid work, employer, Spoor 1/2, role if known. No trajectory explanation.',
    },
    verwachting_trede_nummer: {
      type: 'integer',
      enum: [1, 2, 3, 4, 5, 6],
      description:
        'Expected trede in 3 months based on prognose bedrijfsarts and actuele situatie (not the huidige ladder).',
    },
    verwachting_kern: {
      type: 'string',
      description:
        'Body AFTER the verwachting opener (do not include opener). Complete sentence(s) starting with a capital letter. Never a fragment after "omdat", never start with de/het/omdat/comma. Max ~80 words total with opener. Include exact Spoor 2 block only when logically supported.',
    },
    toelichting_kern: {
      type: 'string',
      description:
        'Continues after "omdat" (do not repeat opener). Grammatical Dutch continuation. Max ~120 words total with opener. Underpin trede, hours, contract, spoor, participation, motivation. Do not mention FML/IZP/LAB, dates, or "benutbare mogelijkheden".',
    },
  },
  required: [
    'q1_duurzaam_benutbare_mogelijkheden',
    'q2_minimaal_2x_buitenshuis',
    'q3_regelmatige_sociale_participatie',
    'q4_gemotiveerd_richting_arbeid',
    'q5_belastbaar_min_12u',
    'q6_verricht_werkzaamheden',
    'q7_betaald_werk',
    'q7_duurzaam_passend_min_65',
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

function parseLadderAnswers(o: Record<string, unknown>): PowLadderAnswers {
  return {
    q1_duurzaam_benutbare_mogelijkheden: coerceBoolean(o.q1_duurzaam_benutbare_mogelijkheden),
    q2_minimaal_2x_buitenshuis: coerceBoolean(o.q2_minimaal_2x_buitenshuis),
    q3_regelmatige_sociale_participatie: coerceBoolean(o.q3_regelmatige_sociale_participatie),
    q4_gemotiveerd_richting_arbeid: coerceBoolean(o.q4_gemotiveerd_richting_arbeid),
    q5_belastbaar_min_12u: coerceBoolean(o.q5_belastbaar_min_12u),
    q6_verricht_werkzaamheden: coerceBoolean(o.q6_verricht_werkzaamheden),
    q7_betaald_werk: coerceBoolean(o.q7_betaald_werk),
    q7_duurzaam_passend_min_65: coerceBoolean(o.q7_duurzaam_passend_min_65),
  };
}

export function parsePowMeterContentResult(raw: unknown): PowMeterContentResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const ladder = parseLadderAnswers(o);
  const huidige_trede_nummer = computeTredeFromLadder(ladder);

  if (o.huidige_trede_nummer != null) {
    const modelTrede = coerceTredeNumber(o.huidige_trede_nummer);
    if (modelTrede !== huidige_trede_nummer) {
      console.warn(
        `⚠️ POW-meter: model huidige_trede_nummer=${modelTrede} genegeerd; ladder→${huidige_trede_nummer}`
      );
    }
  }

  return {
    huidige_trede_nummer,
    ladder,
    huidige_werkzame_uren: coerceString(o.huidige_werkzame_uren),
    verwachting_trede_nummer: coerceTredeNumber(o.verwachting_trede_nummer),
    verwachting_kern: coerceString(o.verwachting_kern),
    toelichting_kern: coerceString(o.toelichting_kern),
  };
}
