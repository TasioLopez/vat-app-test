import type { TredeNumber } from './constants';

/** Yes/no answers for POW-meter V10 decision ladder (Q1–Q7). */
export type PowLadderAnswers = {
  q1_duurzaam_benutbare_mogelijkheden: boolean;
  q2_minimaal_2x_buitenshuis: boolean;
  q3_regelmatige_sociale_participatie: boolean;
  q4_gemotiveerd_richting_arbeid: boolean;
  q5_belastbaar_min_12u: boolean;
  q6_verricht_werkzaamheden: boolean;
  /** Only meaningful if q6 is true; ignored when computing if earlier stop. */
  q7_betaald_werk: boolean;
  /** Only if q7_betaald; true → trede 6, false → trede 5. */
  q7_duurzaam_passend_min_65: boolean;
};

/**
 * Strict V10 ladder: walk Q1→Q7 in order; stop on first Nee.
 * Later answers after a Nee do not change the result.
 */
export function computeTredeFromLadder(a: PowLadderAnswers): TredeNumber {
  if (!a.q1_duurzaam_benutbare_mogelijkheden) return 1;
  if (!a.q2_minimaal_2x_buitenshuis) return 1;
  if (!a.q3_regelmatige_sociale_participatie) return 2;
  if (!a.q4_gemotiveerd_richting_arbeid) return 3;
  if (!a.q5_belastbaar_min_12u) return 3;
  if (!a.q6_verricht_werkzaamheden) return 3;
  if (!a.q7_betaald_werk) return 4;
  return a.q7_duurzaam_passend_min_65 ? 6 : 5;
}

/** Helper for tests: all yes through the given stop, then appropriate tail. */
export function ladderYesThrough(
  lastYesQuestion: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  opts?: { q7_duurzaam?: boolean }
): PowLadderAnswers {
  const q = lastYesQuestion;
  return {
    q1_duurzaam_benutbare_mogelijkheden: q >= 1,
    q2_minimaal_2x_buitenshuis: q >= 2,
    q3_regelmatige_sociale_participatie: q >= 3,
    q4_gemotiveerd_richting_arbeid: q >= 4,
    q5_belastbaar_min_12u: q >= 5,
    q6_verricht_werkzaamheden: q >= 6,
    q7_betaald_werk: q >= 7,
    q7_duurzaam_passend_min_65: Boolean(opts?.q7_duurzaam) && q >= 7,
  };
}
