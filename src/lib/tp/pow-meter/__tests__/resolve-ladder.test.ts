import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PowMeterFacts } from '../facts';
import { computeTredeFromLadder, type PowLadderAnswers } from '../ladder';
import { resolveLadderFromFacts } from '../resolve-ladder';

function allYesLadder(): PowLadderAnswers {
  return {
    q1_duurzaam_benutbare_mogelijkheden: true,
    q2_minimaal_2x_buitenshuis: true,
    q3_regelmatige_sociale_participatie: true,
    q4_gemotiveerd_richting_arbeid: true,
    q5_belastbaar_min_12u: true,
    q6_verricht_werkzaamheden: true,
    q7_betaald_werk: true,
    q7_duurzaam_passend_min_65: false,
  };
}

/** Hulstaart pattern: pre-revalidation, 0 h, inactivity, functional outings only. */
const hulstaartFacts: PowMeterFacts = {
  current_work_hours_per_week: 0,
  fml_max_hours_per_week: 10,
  awaiting_revalidation_or_intensive_treatment: true,
  explicitly_not_loadable_at_intake: true,
  inactivity_or_limited_daily_structure: true,
  outside_deliberate_min_2_per_week: false,
  outside_functional_only: true,
  regular_social_participation_outside: false,
  motivated_toward_work: true,
  performs_work_activities: false,
  paid_work: false,
  duurzaam_passend_min_65: false,
};

/** Melissa pattern: ~1.5 h adapted Spoor 1, motivated, social outside, FML <12. */
const melissaFacts: PowMeterFacts = {
  current_work_hours_per_week: 1.5,
  fml_max_hours_per_week: 10,
  awaiting_revalidation_or_intensive_treatment: false,
  explicitly_not_loadable_at_intake: false,
  inactivity_or_limited_daily_structure: false,
  outside_deliberate_min_2_per_week: true,
  outside_functional_only: false,
  regular_social_participation_outside: true,
  motivated_toward_work: true,
  performs_work_activities: true,
  paid_work: false,
  duurzaam_passend_min_65: false,
};

/** Williams pattern: ~2 h adapted Spoor 1, functional outings flagged, no social outside. */
const williamsFacts: PowMeterFacts = {
  current_work_hours_per_week: 2,
  fml_max_hours_per_week: null,
  awaiting_revalidation_or_intensive_treatment: false,
  explicitly_not_loadable_at_intake: false,
  inactivity_or_limited_daily_structure: false,
  outside_deliberate_min_2_per_week: false,
  outside_functional_only: true,
  regular_social_participation_outside: false,
  motivated_toward_work: true,
  performs_work_activities: true,
  paid_work: true,
  duurzaam_passend_min_65: false,
};

const williamsOptimisticQ3Facts: PowMeterFacts = {
  ...williamsFacts,
  outside_functional_only: false,
  regular_social_participation_outside: true,
};

/** Legacy V10 ladder helpers — kept for unit coverage; not used on the live V11 path. */
describe('resolveLadderFromFacts (legacy V10)', () => {
  it('Hulstaart: coerces optimistic model ladder to trede 1', () => {
    const { ladder, adjustments } = resolveLadderFromFacts(hulstaartFacts, allYesLadder());
    assert.ok(adjustments.length > 0);
    assert.equal(ladder.q1_duurzaam_benutbare_mogelijkheden, false);
    assert.equal(ladder.q2_minimaal_2x_buitenshuis, false);
    assert.equal(ladder.q3_regelmatige_sociale_participatie, false);
    assert.equal(ladder.q5_belastbaar_min_12u, false);
    assert.equal(ladder.q6_verricht_werkzaamheden, false);
    assert.equal(computeTredeFromLadder(ladder), 1);
  });

  it('Melissa: coerces to trede 3 via Q5 Nee (FML 10h)', () => {
    const { ladder } = resolveLadderFromFacts(melissaFacts, allYesLadder());
    assert.equal(ladder.q3_regelmatige_sociale_participatie, true);
    assert.equal(ladder.q4_gemotiveerd_richting_arbeid, true);
    assert.equal(ladder.q5_belastbaar_min_12u, false);
    assert.equal(ladder.q6_verricht_werkzaamheden, true);
    assert.equal(computeTredeFromLadder(ladder), 3);
  });

  it('Williams: adapted work overrides functional-only Q2 → trede 2', () => {
    const { ladder, adjustments } = resolveLadderFromFacts(williamsFacts, {
      ...allYesLadder(),
      q2_minimaal_2x_buitenshuis: false,
    });
    assert.ok(adjustments.some((a) => a.includes('q2_minimaal_2x_buitenshuis=true')));
    assert.equal(ladder.q2_minimaal_2x_buitenshuis, true);
    assert.equal(ladder.q3_regelmatige_sociale_participatie, false);
    assert.equal(ladder.q5_belastbaar_min_12u, false);
    assert.equal(computeTredeFromLadder(ladder), 2);
  });

  it('Williams: optimistic Q3 (work/family as social) still coerces to trede 2', () => {
    const { ladder, adjustments } = resolveLadderFromFacts(
      williamsOptimisticQ3Facts,
      allYesLadder()
    );
    assert.ok(
      adjustments.some((a) => a.includes('q3_regelmatige_sociale_participatie=false'))
    );
    assert.equal(ladder.q2_minimaal_2x_buitenshuis, true);
    assert.equal(ladder.q3_regelmatige_sociale_participatie, false);
    assert.equal(computeTredeFromLadder(ladder), 2);
  });
});
