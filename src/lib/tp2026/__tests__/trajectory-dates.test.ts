import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTrajectoryDateUpdates, applyTrajectoryDateDerivations } from '../trajectory-dates';

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

describe('applyTrajectoryDateDerivations', () => {
  it('keeps explicit intake start/end unchanged', () => {
    const input = {
      first_sick_day: '2024-01-15',
      registration_date: '2024-01-20',
      intake_date: '2024-01-10',
      tp_start_date: '2026-06-05',
      tp_end_date: '2027-07-05',
    };

    const result = applyTrajectoryDateDerivations(input);
    assert.equal(result.tp_start_date, '2026-06-05');
    assert.equal(result.tp_end_date, '2027-07-05');
    assert.equal(result.tp_lead_time, '57');
  });
});
