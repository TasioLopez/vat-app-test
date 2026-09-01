import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectZoekprofielScenario } from '../detect-scenario';
import type { EmployeeDoc } from '../generate';

const intakeDoc: EmployeeDoc = { type: 'intakeformulier', url: 'x' };
const adDoc: EmployeeDoc = { type: 'ad_rapport', url: 'x' };
const fmlDoc: EmployeeDoc = { type: 'fml', url: 'x' };
const spreekDoc: EmployeeDoc = { type: 'spreek_reportage', url: 'x' };

describe('detectZoekprofielScenario', () => {
  it('returns insufficient when no relevant docs', () => {
    const result = detectZoekprofielScenario([]);
    assert.equal(result.scenario, 'insufficient');
    assert.equal(result.hasRelevantDocs, false);
  });

  it('returns insufficient when only intake without AD narrative', () => {
    const result = detectZoekprofielScenario([intakeDoc], {
      has_ad_report: false,
    });
    assert.equal(result.scenario, 'insufficient');
  });

  it('returns ad_embedded_belastbaarheid when AD present without separate belast doc', () => {
    const result = detectZoekprofielScenario([intakeDoc, adDoc], {
      has_ad_report: true,
    });
    assert.equal(result.scenario, 'ad_embedded_belastbaarheid');
    assert.equal(result.hasSeparateBelastDoc, false);
  });

  it('returns separate_belastbaarheid when FML uploaded', () => {
    const result = detectZoekprofielScenario([intakeDoc, fmlDoc]);
    assert.equal(result.scenario, 'separate_belastbaarheid');
    assert.equal(result.hasSeparateBelastDoc, true);
  });

  it('returns separate_belastbaarheid when spreekuur present', () => {
    const result = detectZoekprofielScenario([intakeDoc, spreekDoc]);
    assert.equal(result.scenario, 'separate_belastbaarheid');
    assert.equal(result.hasSpreekuurDoc, true);
  });
});
