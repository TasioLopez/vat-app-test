import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAmsterdamMonthRange,
  resolveDashboardScope,
} from '@/lib/dashboard/stats';

describe('resolveDashboardScope', () => {
  it('forces mine for regular users even when all is requested', () => {
    assert.equal(resolveDashboardScope('user', 'all'), 'mine');
    assert.equal(resolveDashboardScope('user', 'mine'), 'mine');
    assert.equal(resolveDashboardScope('user', null), 'mine');
  });

  it('forces mine for back_office (like a normal user)', () => {
    assert.equal(resolveDashboardScope('back_office', 'all'), 'mine');
    assert.equal(resolveDashboardScope('back_office', undefined), 'mine');
  });

  it('defaults admin to all and accepts mine/all', () => {
    assert.equal(resolveDashboardScope('admin', null), 'all');
    assert.equal(resolveDashboardScope('admin', 'xyz'), 'all');
    assert.equal(resolveDashboardScope('admin', 'mine'), 'mine');
    assert.equal(resolveDashboardScope('admin', 'all'), 'all');
  });
});

describe('getAmsterdamMonthRange', () => {
  it('returns a half-open month range covering mid-September 2026', () => {
    const { startIso, endIso } = getAmsterdamMonthRange(
      new Date('2026-09-15T12:00:00.000Z')
    );
    const start = new Date(startIso);
    const end = new Date(endIso);
    const mid = new Date('2026-09-15T12:00:00.000Z');
    assert.ok(start < mid);
    assert.ok(mid < end);
    // September has 30 days
    const days = (end.getTime() - start.getTime()) / 86400000;
    assert.equal(days, 30);
  });
});
