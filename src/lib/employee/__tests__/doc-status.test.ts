import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCvStatusMap,
  buildTpStatusMap,
  chunkIds,
  cvStatusRank,
  isShareLinkActive,
  maxCvStatus,
  maxTpStatus,
  tpStatusRank,
} from '@/lib/employee/doc-status';

describe('doc-status helpers', () => {
  it('ranks TP statuses none < draft < completed', () => {
    assert.ok(tpStatusRank('none') < tpStatusRank('draft'));
    assert.ok(tpStatusRank('draft') < tpStatusRank('completed'));
    assert.equal(maxTpStatus('draft', 'completed'), 'completed');
  });

  it('ranks CV statuses none < draft < shared < opened', () => {
    assert.ok(cvStatusRank('none') < cvStatusRank('draft'));
    assert.ok(cvStatusRank('draft') < cvStatusRank('shared'));
    assert.ok(cvStatusRank('shared') < cvStatusRank('opened'));
    assert.equal(maxCvStatus('shared', 'opened'), 'opened');
  });

  it('builds TP map from instances and exports', () => {
    const map = buildTpStatusMap(
      [
        { id: 'tp1', employee_id: 'e1' },
        { id: 'tp2', employee_id: 'e2' },
        { id: 'tp3', employee_id: 'e2' },
      ],
      new Set(['tp3'])
    );
    assert.equal(map.get('e1'), 'draft');
    assert.equal(map.get('e2'), 'completed');
    assert.equal(map.get('e3'), undefined);
  });

  it('builds CV map with share progression', () => {
    const now = new Date('2026-10-04T12:00:00.000Z');
    const map = buildCvStatusMap(
      [
        { employee_id: 'e1' },
        { employee_id: 'e2' },
        { employee_id: 'e3' },
      ],
      [
        {
          employee_id: 'e2',
          revoked_at: null,
          expires_at: '2026-12-01T00:00:00.000Z',
          last_accessed_at: null,
        },
        {
          employee_id: 'e3',
          revoked_at: null,
          expires_at: '2026-12-01T00:00:00.000Z',
          last_accessed_at: '2026-10-01T00:00:00.000Z',
        },
        {
          employee_id: 'e1',
          revoked_at: '2026-09-01T00:00:00.000Z',
          expires_at: '2026-12-01T00:00:00.000Z',
          last_accessed_at: '2026-08-01T00:00:00.000Z',
        },
      ],
      now
    );

    assert.equal(map.get('e1'), 'draft');
    assert.equal(map.get('e2'), 'shared');
    assert.equal(map.get('e3'), 'opened');
  });

  it('treats expired or revoked shares as inactive', () => {
    const now = new Date('2026-10-04T12:00:00.000Z');
    assert.equal(
      isShareLinkActive({
        revoked_at: null,
        expires_at: '2026-09-01T00:00:00.000Z',
        now,
      }),
      false
    );
    assert.equal(
      isShareLinkActive({
        revoked_at: '2026-10-01T00:00:00.000Z',
        expires_at: '2026-12-01T00:00:00.000Z',
        now,
      }),
      false
    );
  });

  it('chunks ids for batch queries', () => {
    assert.deepEqual(chunkIds([1, 2, 3, 4], 2), [
      [1, 2],
      [3, 4],
    ]);
    assert.deepEqual(chunkIds([], 2), []);
  });
});
