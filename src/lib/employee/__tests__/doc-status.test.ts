import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCvStatusMap,
  buildIntakeStatusMap,
  buildTpStatusMap,
  buildVgrStatusMap,
  chunkIds,
  cvStatusRank,
  isShareLinkActive,
  maxCvStatus,
  maxTpStatus,
  resolveBuilderDocStatus,
  summarizeGeneratedDocs,
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

  it('builds Intake map with the same instance/export rules as TP', () => {
    const map = buildIntakeStatusMap(
      [
        { id: 'in1', employee_id: 'e1' },
        { id: 'in2', employee_id: 'e2' },
      ],
      new Set(['in2'])
    );
    assert.equal(map.get('e1'), 'draft');
    assert.equal(map.get('e2'), 'completed');
  });

  it('builds VGR map from exports and final instances', () => {
    const map = buildVgrStatusMap(
      [
        { id: 'v1', employee_id: 'e1', status: 'draft' },
        { id: 'v2', employee_id: 'e2', status: 'final' },
        { id: 'v3', employee_id: 'e3', status: 'draft' },
        { id: 'v4', employee_id: 'e3', status: 'in_progress' },
      ],
      new Set(['v3'])
    );
    assert.equal(map.get('e1'), 'draft');
    assert.equal(map.get('e2'), 'completed');
    assert.equal(map.get('e3'), 'completed');
    assert.equal(map.get('e4'), undefined);
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

  it('summarizes exported PDFs per generated document kind', () => {
    const summary = summarizeGeneratedDocs([
      { type: 'tp', uploaded_at: '2026-10-01T10:00:00.000Z' },
      { type: 'TP ', uploaded_at: '2026-11-02T10:00:00.000Z' },
      { type: 'vgr', uploaded_at: null },
      { type: 'intakeformulier', uploaded_at: '2026-09-01T10:00:00.000Z' },
      { type: null, uploaded_at: '2026-09-01T10:00:00.000Z' },
    ]);

    assert.deepEqual(summary.tp, { exportCount: 2, lastExportAt: '2026-11-02T10:00:00.000Z' });
    assert.deepEqual(summary.vgr, { exportCount: 1, lastExportAt: null });
    assert.deepEqual(summary.intake, { exportCount: 0, lastExportAt: null });
  });

  it('resolves builder status from instances and exports', () => {
    assert.equal(resolveBuilderDocStatus({ hasInstance: false, exportCount: 0 }), 'none');
    assert.equal(resolveBuilderDocStatus({ hasInstance: true, exportCount: 0 }), 'draft');
    assert.equal(resolveBuilderDocStatus({ hasInstance: true, exportCount: 2 }), 'completed');
    assert.equal(resolveBuilderDocStatus({ hasInstance: false, exportCount: 1 }), 'completed');
    assert.equal(
      resolveBuilderDocStatus({ hasInstance: true, exportCount: 0, hasFinalInstance: true }),
      'completed'
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
