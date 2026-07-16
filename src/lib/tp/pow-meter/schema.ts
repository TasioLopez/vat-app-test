import type { TredeNumber } from './constants';
import type { PowMeterFacts } from './facts';
import { parsePowMeterFacts, POW_METER_FACTS_JSON_PROPERTIES, POW_METER_FACTS_REQUIRED_KEYS } from './facts';
import { computeTredeFromLadder, type PowLadderAnswers } from './ladder';
import { resolveLadderFromFacts } from './resolve-ladder';

/** Structured content after parse: ladder-computed trede + kernels for server assembly. */
export type PowMeterContentResult = {
  huidige_trede_nummer: TredeNumber;
  ladder: PowLadderAnswers;
  facts: PowMeterFacts;
  huidige_werkzame_uren: string;
  verwachting_trede_nummer: TredeNumber;
  verwachting_includes_spoor2_block: boolean;
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
    ...POW_METER_FACTS_JSON_PROPERTIES,
    q1_duurzaam_benutbare_mogelijkheden: ladderBooleanProperty(
      'Vraag 1: duurzaam benutbare mogelijkheden op intake? Moet consistent zijn met facts. true=Ja, false=Nee.'
    ),
    q2_minimaal_2x_buitenshuis: ladderBooleanProperty(
      'Vraag 2 (strict): bewuste buitenactiviteiten ≥2×/week OF aangepast/on-site werk? Zorgtaken/boodschappen alleen = false. Consistent met outside_deliberate_min_2_per_week OF performs_work_activities.'
    ),
    q3_regelmatige_sociale_participatie: ladderBooleanProperty(
      'Vraag 3 (strict): regelmatige sociale participatie buitenshuis (club/sport/vaste afspraak)? Thuiscontact/familie/werk/Spoor 1 = false. Vereist outside_deliberate_min_2_per_week én regular_social_participation_outside.'
    ),
    q4_gemotiveerd_richting_arbeid: ladderBooleanProperty(
      'Vraag 4: gemotiveerd richting arbeid? Moet consistent zijn met motivated_toward_work.'
    ),
    q5_belastbaar_min_12u: ladderBooleanProperty(
      'Vraag 5: feitelijk ~≥12 uur/week belastbaar op intake (niet FML-theorie alleen). FML <12 = false.'
    ),
    q6_verricht_werkzaamheden: ladderBooleanProperty(
      'Vraag 6: verricht werkzaamheden? Moet consistent zijn met performs_work_activities. 0 uur → false.'
    ),
    q7_betaald_werk: ladderBooleanProperty(
      'Vraag 7: betaald werk? Moet consistent zijn met paid_work. Alleen relevant als q6 true.'
    ),
    q7_duurzaam_passend_min_65: ladderBooleanProperty(
      'Alleen bij betaald werk: duurzaam passend ≥~65%. Moet consistent zijn met duurzaam_passend_min_65.'
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
    verwachting_includes_spoor2_block: {
      type: 'boolean',
      description:
        'true wanneer Spoor 2 logisch uit documenten volgt. Systeem voegt het vaste Spoor 2-blok toe — zet het NIET in verwachting_kern.',
    },
    verwachting_kern: {
      type: 'string',
      description:
        'Body AFTER the verwachting opener (do not include opener or Spoor 2-block). Complete sentence(s) starting with a capital letter. Never start with de/het/omdat/comma. Max ~130 words total with opener + Spoor2 indien van toepassing.',
    },
    toelichting_kern: {
      type: 'string',
      description:
        'Continues after "omdat" (do not repeat opener). Grammatical Dutch continuation. Max ~150 words total with opener. Underpin trede, hours, contract, spoor, participation, motivation. Do not mention FML/IZP/LAB, dates, or "benutbare mogelijkheden".',
    },
  },
  required: [
    ...POW_METER_FACTS_REQUIRED_KEYS,
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
    'verwachting_includes_spoor2_block',
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

const MAX_VERWACHTING_JUMP = 2;

/**
 * Cap model verwachting so it stays plausible vs ladder-computed huidige trede and intake hours.
 */
export function capVerwachtingTrede(
  huidige: TredeNumber,
  modelVerwachting: TredeNumber,
  facts: PowMeterFacts
): TredeNumber {
  let capped = Math.min(modelVerwachting, huidige + MAX_VERWACHTING_JUMP) as TredeNumber;

  if (
    facts.current_work_hours_per_week < 12 &&
    !facts.duurzaam_passend_min_65 &&
    capped > Math.max(huidige + 1, 3)
  ) {
    capped = Math.max(huidige + 1, 3) as TredeNumber;
  }

  if (capped < huidige) {
    capped = huidige;
  }

  if (capped !== modelVerwachting) {
    console.warn(
      `⚠️ POW-meter: verwachting_trede ${modelVerwachting} → ${capped} (huidige=${huidige}, intake=${facts.current_work_hours_per_week}h)`
    );
  }

  return capped;
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
  const facts = parsePowMeterFacts(o);
  const modelLadder = parseLadderAnswers(o);
  const { ladder } = resolveLadderFromFacts(facts, modelLadder);
  const huidige_trede_nummer = computeTredeFromLadder(ladder);

  if (o.huidige_trede_nummer != null) {
    const modelTrede = coerceTredeNumber(o.huidige_trede_nummer);
    if (modelTrede !== huidige_trede_nummer) {
      console.warn(
        `⚠️ POW-meter: model huidige_trede_nummer=${modelTrede} genegeerd; ladder→${huidige_trede_nummer}`
      );
    }
  }

  const rawVerwachting = coerceTredeNumber(o.verwachting_trede_nummer);
  const verwachting_trede_nummer = capVerwachtingTrede(
    huidige_trede_nummer,
    rawVerwachting,
    facts
  );

  return {
    huidige_trede_nummer,
    ladder,
    facts,
    huidige_werkzame_uren: coerceString(o.huidige_werkzame_uren),
    verwachting_trede_nummer,
    verwachting_includes_spoor2_block: coerceBoolean(o.verwachting_includes_spoor2_block),
    verwachting_kern: coerceString(o.verwachting_kern),
    toelichting_kern: coerceString(o.toelichting_kern),
  };
}
