import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOfficialBijlage2Model } from '@/lib/vgr/bijlage2-official';
import {
  ensureVGRShape,
  normalizeBijlage2Model,
  vgrBijlagenAreEmpty,
} from '@/lib/vgr/mapping';
import { extractBijlagenFromTp2026 } from '@/lib/vgr/migrate-from-tp';

describe('ensureVGRShape', () => {
  it('applies defaults for empty payload', () => {
    const shaped = ensureVGRShape({});
    assert.ok(shaped.bijlage2_model);
    assert.equal(shaped.bijlage3_decisions.length, 7);
    assert.deepEqual(shaped.bijlage3_page2, { doelJa: false, doelNee: false });
  });
});

describe('normalizeBijlage2Model', () => {
  it('preserves checked state by label', () => {
    const base = createOfficialBijlage2Model();
    const firstLabel = base.willen[0].label;
    const normalized = normalizeBijlage2Model({
      willen: [{ label: firstLabel, checked: true }],
    });
    assert.equal(normalized.willen[0].checked, true);
    assert.equal(normalized.willen[1].checked, false);
  });
});

describe('extractBijlagenFromTp2026', () => {
  it('copies bijlage keys from TP payload', () => {
    const tp = {
      bijlage2_model: { willen: [] },
      bijlage3_decisions: [{ id: 'b3_step_1' }],
      bijlage3_page2: { doelJa: true, doelNee: false },
      bijlage1_phases: [],
    };
    const extracted = extractBijlagenFromTp2026(tp);
    assert.ok('bijlage2_model' in extracted);
    assert.ok('bijlage3_decisions' in extracted);
    assert.ok('bijlage3_page2' in extracted);
    assert.ok(!('bijlage1_phases' in extracted));
  });
});

describe('vgrBijlagenAreEmpty', () => {
  it('returns true for fresh defaults', () => {
    assert.equal(vgrBijlagenAreEmpty(ensureVGRShape({})), true);
  });
});
