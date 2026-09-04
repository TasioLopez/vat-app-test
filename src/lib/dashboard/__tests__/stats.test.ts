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

  it('defaults admin and back_office to all', () => {
    assert.equal(resolveDashboardScope('admin', null), 'all');
    assert.equal(resolveDashboardScope('back_office', undefined), 'all');
    assert.equal(resolveDashboardScope('admin', 'xyz'), 'all');
  });

  it('accepts mine and all for admin and back_office', () => {
    assert.equal(resolveDashboardScope('admin', 'mine'), 'mine');
    assert.equal(resolveDashboardScope('admin', 'all'), 'all');
    assert.equal(resolveDashboardScope('back_office', 'mine'), 'mine');
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
