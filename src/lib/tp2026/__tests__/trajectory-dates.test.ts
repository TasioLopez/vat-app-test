import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTrajectoryDateUpdates,
  applyTrajectoryDateDerivations,
  isLowTpLeadTime,
  parseTpLeadTimeWeeks,
} from '../trajectory-dates';

describe('getTrajectoryDateUpdates', () => {
  it('does not overwrite explicit tp_start_date and tp_end_date from intake', () => {
    const data = {
      first_sick_day: '2024-01-15',
      registration_date: '2024-01-20',
      intake_date: '2024-01-10',
      tp_start_date: '2026-06-05',
      tp_end_date: '2027-07-05',
    };

    const updates = getTrajectoryDateUpdates(data);
    assert.equal(updates.tp_start_date, undefined);
    assert.equal(updates.tp_end_date, undefined);
    assert.equal(updates.tp_lead_time, '57');
  });

  it('derives start/end when not set from intake', () => {
    const data = {
      first_sick_day: '2024-01-15',
      registration_date: '2024-01-20',
      intake_date: '2024-01-10',
    };

    const updates = getTrajectoryDateUpdates(data);
    assert.equal(updates.tp_end_date, '2026-01-15');
    // 2-year trajectory from registration → 53+ weeks → start = intake_date
    assert.equal(updates.tp_start_date, '2024-01-10');
    assert.ok(updates.tp_lead_time);
  });

  it('uses intake_date as start when trajectory is 53+ weeks', () => {
    const data = {
      first_sick_day: '2020-01-01',
      registration_date: '2020-01-05',
      intake_date: '2020-06-01',
    };

    const updates = getTrajectoryDateUpdates(data);
    assert.equal(updates.tp_start_date, '2020-06-01');
  });
});

describe('parseTpLeadTimeWeeks', () => {
  it('parses numeric strings', () => {
    assert.equal(parseTpLeadTimeWeeks('9'), 9);
    assert.equal(parseTpLeadTimeWeeks(57), 57);
  });

  it('returns null for empty or invalid values', () => {
    assert.equal(parseTpLeadTimeWeeks(''), null);
    assert.equal(parseTpLeadTimeWeeks(null), null);
    assert.equal(parseTpLeadTimeWeeks('abc'), null);
  });
});

describe('isLowTpLeadTime', () => {
  it('flags values below 10 weeks', () => {
    assert.equal(isLowTpLeadTime('9'), true);
    assert.equal(isLowTpLeadTime(0), true);
  });

  it('does not flag 10 weeks or above', () => {
    assert.equal(isLowTpLeadTime('10'), false);
    assert.equal(isLowTpLeadTime('57'), false);
  });

  it('returns false for missing values', () => {
    assert.equal(isLowTpLeadTime(''), false);
    assert.equal(isLowTpLeadTime(undefined), false);
  });
});

describe('applyTrajectoryDateDerivations', () => {
  it('keeps explicit intake start/end unchanged', () => {
    const input = {
      first_sick_day: '2024-01-15',
      registration_date: '2024-01-20',
      intake_date: '2024-01-10',
      tp_start_date: '2026-06-05',
      tp_end_date: '2027-07-05',
    };

    const result = applyTrajectoryDateDerivations(input) as typeof input & { tp_lead_time?: string };
    assert.equal(result.tp_start_date, '2026-06-05');
    assert.equal(result.tp_end_date, '2027-07-05');
    assert.equal(result.tp_lead_time, '57');
  });
});
