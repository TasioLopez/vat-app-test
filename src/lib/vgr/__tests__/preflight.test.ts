import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeVgrPreflight } from '@/lib/vgr/preflight';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { vgrPeriodeText } from '@/lib/vgr/period';

describe('vgrPeriodeText', () => {
  it('uses t/m with full NL dates', () => {
    const data = ensureVGRShape({
      vgr_meta: { period_start: '2026-05-29', period_end: '2026-09-21' },
    });
    assert.equal(vgrPeriodeText(data), '29 mei 2026 t/m 21 september 2026');
  });
});

describe('computeVgrPreflight', () => {
  it('flags medical FML=EZD as blocking generate-all', () => {
    const data = ensureVGRShape({
      first_sick_day: '2025-01-01',
      fml_izp_lab_date: '2025-01-01',
      vgr_meta: { period_start: '2026-09-01', period_end: '2026-10-28', report_date: '2026-10-28' },
    });
    const out = computeVgrPreflight(data, ['fml_izp', 'intakeformulier']);
    assert.equal(out.blocksGenerateAll, true);
    assert.ok(out.medicalConflicts.length > 0);
  });

  it('marks applications not yet relevant when wekelijks is off', () => {
    const data = ensureVGRShape({
      vgr_meta: { period_start: '2026-09-01', period_end: '2026-10-28', report_date: '2026-10-28' },
      applications: [],
      body: { interventies_activatie: { selected: [] } },
    });
    const out = computeVgrPreflight(data, []);
    const apps = out.modules.find((m) => m.id === 'applications');
    assert.equal(apps?.status, 'NOT_YET_RELEVANT');
  });
});
