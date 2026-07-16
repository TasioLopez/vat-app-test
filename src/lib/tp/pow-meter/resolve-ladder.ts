import type { PowMeterFacts } from './facts';
import type { PowLadderAnswers } from './ladder';

export type ResolveLadderResult = {
  ladder: PowLadderAnswers;
  adjustments: string[];
};

function setFalse(
  ladder: PowLadderAnswers,
  adjustments: string[],
  key: keyof PowLadderAnswers,
  reason: string
): void {
  if (ladder[key] !== false) {
    ladder[key] = false;
    adjustments.push(`${key}=false (${reason})`);
  }
}

function setTrue(
  ladder: PowLadderAnswers,
  adjustments: string[],
  key: keyof PowLadderAnswers,
  reason: string
): void {
  if (ladder[key] !== true) {
    ladder[key] = true;
    adjustments.push(`${key}=true (${reason})`);
  }
}

/** Adapted/on-site work implies deliberate buitenshuis, even alongside functional errands. */
function workSupportsDeliberateOutside(facts: PowMeterFacts): boolean {
  return facts.performs_work_activities && facts.current_work_hours_per_week > 0;
}

/**
 * Apply fact-driven coercion to model ladder booleans.
 * Hard overrides enforce strict Q2/Q3 and intake reality for Q1/Q5/Q6.
 */
export function resolveLadderFromFacts(
  facts: PowMeterFacts,
  model: PowLadderAnswers
): ResolveLadderResult {
  const ladder: PowLadderAnswers = { ...model };
  const adjustments: string[] = [];

  if (facts.awaiting_revalidation_or_intensive_treatment) {
    setFalse(ladder, adjustments, 'q1_duurzaam_benutbare_mogelijkheden', 'awaiting revalidation');
    setFalse(ladder, adjustments, 'q5_belastbaar_min_12u', 'awaiting revalidation');
  }
  if (facts.explicitly_not_loadable_at_intake) {
    setFalse(ladder, adjustments, 'q1_duurzaam_benutbare_mogelijkheden', 'not loadable at intake');
    setFalse(ladder, adjustments, 'q5_belastbaar_min_12u', 'not loadable at intake');
  }

  if (facts.inactivity_or_limited_daily_structure) {
    setFalse(ladder, adjustments, 'q3_regelmatige_sociale_participatie', 'inactivity/limited daily structure');
  }
  if (!facts.regular_social_participation_outside) {
    setFalse(ladder, adjustments, 'q3_regelmatige_sociale_participatie', 'no regular social outside');
  }

  if (workSupportsDeliberateOutside(facts)) {
    setTrue(
      ladder,
      adjustments,
      'q2_minimaal_2x_buitenshuis',
      'structured work activities (adapted/on-site) ≥2×/week'
    );
  } else {
    if (facts.outside_functional_only) {
      setFalse(ladder, adjustments, 'q2_minimaal_2x_buitenshuis', 'outside functional only (strict Q2)');
    }
    if (!facts.outside_deliberate_min_2_per_week) {
      setFalse(ladder, adjustments, 'q2_minimaal_2x_buitenshuis', 'no deliberate outside ≥2×/week');
    }
  }

  if (facts.current_work_hours_per_week === 0) {
    setFalse(ladder, adjustments, 'q6_verricht_werkzaamheden', '0 work hours');
  }
  if (!facts.performs_work_activities) {
    setFalse(ladder, adjustments, 'q6_verricht_werkzaamheden', 'no work activities');
  }

  if (facts.fml_max_hours_per_week != null && facts.fml_max_hours_per_week < 12) {
    setFalse(ladder, adjustments, 'q5_belastbaar_min_12u', `FML max ${facts.fml_max_hours_per_week}h < 12`);
  }
  if (
    facts.current_work_hours_per_week < 12 &&
    (facts.fml_max_hours_per_week == null || facts.fml_max_hours_per_week < 12)
  ) {
    setFalse(
      ladder,
      adjustments,
      'q5_belastbaar_min_12u',
      `intake ${facts.current_work_hours_per_week}h/week < 12 (no FML ≥12h)`
    );
  }

  // Soft mapping: prefer facts over model when facts are explicit.
  ladder.q4_gemotiveerd_richting_arbeid = facts.motivated_toward_work;

  if (ladder.q6_verricht_werkzaamheden) {
    ladder.q7_betaald_werk = facts.paid_work;
    if (facts.paid_work) {
      ladder.q7_duurzaam_passend_min_65 = facts.duurzaam_passend_min_65;
    } else {
      ladder.q7_duurzaam_passend_min_65 = false;
    }
  } else {
    ladder.q7_betaald_werk = false;
    ladder.q7_duurzaam_passend_min_65 = false;
  }

  // Q1 soft: usable at intake when not blocked by treatment/loadability flags.
  if (
    !facts.awaiting_revalidation_or_intensive_treatment &&
    !facts.explicitly_not_loadable_at_intake
  ) {
    // Keep model q1 unless already forced false; facts don't have a separate "has benutbare mogelijkheden" field.
  }

  for (const msg of adjustments) {
    console.warn(`⚠️ POW-meter ladder: coerced ${msg}`);
  }

  return { ladder, adjustments };
}
