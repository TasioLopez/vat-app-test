import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeTredeFromLadder, ladderYesThrough, type PowLadderAnswers } from '../ladder';

function allYes(overrides: Partial<PowLadderAnswers> = {}): PowLadderAnswers {
  return {
    q1_duurzaam_benutbare_mogelijkheden: true,
    q2_minimaal_2x_buitenshuis: true,
    q3_regelmatige_sociale_participatie: true,
    q4_gemotiveerd_richting_arbeid: true,
    q5_belastbaar_min_12u: true,
    q6_verricht_werkzaamheden: true,
    q7_betaald_werk: true,
    q7_duurzaam_passend_min_65: false,
    ...overrides,
  };
}

describe('computeTredeFromLadder', () => {
  it('returns trede 1 when Q1 is Nee', () => {
    assert.equal(computeTredeFromLadder(allYes({ q1_duurzaam_benutbare_mogelijkheden: false })), 1);
  });

  it('returns trede 1 when Q2 is Nee (Q1 Ja)', () => {
    assert.equal(
      computeTredeFromLadder(
        allYes({
          q2_minimaal_2x_buitenshuis: false,
        })
      ),
      1
    );
  });

  it('returns trede 2 when Q3 is Nee', () => {
    assert.equal(
      computeTredeFromLadder(allYes({ q3_regelmatige_sociale_participatie: false })),
      2
    );
  });

  it('returns trede 3 when Q4 is Nee', () => {
    assert.equal(computeTredeFromLadder(allYes({ q4_gemotiveerd_richting_arbeid: false })), 3);
  });

  it('returns trede 3 when Q5 is Nee', () => {
    assert.equal(computeTredeFromLadder(allYes({ q5_belastbaar_min_12u: false })), 3);
  });

  it('returns trede 3 when Q6 is Nee (0 uur work stops here)', () => {
    assert.equal(computeTredeFromLadder(allYes({ q6_verricht_werkzaamheden: false })), 3);
  });

  it('returns trede 4 when Q7 betaald is Nee', () => {
    assert.equal(computeTredeFromLadder(allYes({ q7_betaald_werk: false })), 4);
  });

  it('returns trede 5 when betaald but not duurzaam 65%', () => {
    assert.equal(
      computeTredeFromLadder(allYes({ q7_betaald_werk: true, q7_duurzaam_passend_min_65: false })),
      5
    );
  });

  it('returns trede 6 when duurzaam passend min 65%', () => {
    assert.equal(
      computeTredeFromLadder(allYes({ q7_betaald_werk: true, q7_duurzaam_passend_min_65: true })),
      6
    );
  });

  it('ignores later Yes answers after an early Nee', () => {
    // Q2 Nee but everything after somehow true — still trede 1
    assert.equal(computeTredeFromLadder(ladderYesThrough(1)), 1);
    assert.equal(
      computeTredeFromLadder({
        ...ladderYesThrough(1),
        q3_regelmatige_sociale_participatie: true,
        q4_gemotiveerd_richting_arbeid: true,
        q5_belastbaar_min_12u: true,
        q6_verricht_werkzaamheden: true,
        q7_betaald_werk: true,
        q7_duurzaam_passend_min_65: true,
      }),
      1
    );
  });
});
