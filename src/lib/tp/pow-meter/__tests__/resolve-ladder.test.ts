import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PowMeterFacts } from '../facts';
import { computeTredeFromLadder, type PowLadderAnswers } from '../ladder';
import { resolveLadderFromFacts } from '../resolve-ladder';
import { parsePowMeterContentResult } from '../schema';

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

describe('resolveLadderFromFacts', () => {
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
});

describe('parsePowMeterContentResult with facts', () => {
  it('computes trede 1 from Hulstaart-like raw payload', () => {
    const result = parsePowMeterContentResult({
      ...hulstaartFacts,
      ...allYesLadder(),
      huidige_werkzame_uren: '0 uur',
      verwachting_trede_nummer: 2,
      verwachting_includes_spoor2_block: true,
      verwachting_kern: 'Revalidatie staat centraal.',
      toelichting_kern: 'werknemer nog niet belastbaar is en 0 uur per week werkt.',
    });
    assert.equal(result.huidige_trede_nummer, 1);
    assert.equal(result.facts.current_work_hours_per_week, 0);
  });

  it('computes trede 3 from Melissa-like raw payload', () => {
    const result = parsePowMeterContentResult({
      ...melissaFacts,
      ...allYesLadder(),
      huidige_werkzame_uren: '1,5 uur aangepast werk',
      verwachting_trede_nummer: 3,
      verwachting_includes_spoor2_block: false,
      verwachting_kern: 'Gefaseerde urenopbouw verwacht.',
      toelichting_kern: 'haar belastbaarheid nog laag is en zij circa 1,5 uur per week werkt.',
    });
    assert.equal(result.huidige_trede_nummer, 3);
  });
});
