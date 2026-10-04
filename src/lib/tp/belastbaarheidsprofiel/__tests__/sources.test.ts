import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasUsableBelastbaarheidsContent } from '../build-fields';
import { buildBelastbaarheidsprofielGeenProfielFields } from '../build-fields';
import { BELASTBAARHEID_GEEN_PROFIEL } from '../constants';
import {
  hasBelastbaarheidsSource,
  hasAdDoc,
  hasIntakeDoc,
  hasSeparateBelastOrSpreekuurDoc,
} from '../sources';

describe('hasBelastbaarheidsSource', () => {
  it('is true for intake-only docs', () => {
    assert.equal(
      hasBelastbaarheidsSource([{ type: 'intakeformulier', url: 'https://x/intake.pdf' }]),
      true
    );
    assert.equal(hasIntakeDoc([{ type: 'intakeformulier', url: 'https://x/intake.pdf' }]), true);
  });

  it('is true for AD-only docs', () => {
    assert.equal(
      hasBelastbaarheidsSource([{ type: 'ad_rapportage', url: 'https://x/ad.pdf' }]),
      true
    );
    assert.equal(hasAdDoc([{ type: 'ad_rapportage', url: 'https://x/ad.pdf' }]), true);
  });

  it('is true for FML and spreekuur', () => {
    assert.equal(
      hasBelastbaarheidsSource([{ type: 'fml_izp', url: 'https://x/fml.pdf' }]),
      true
    );
    assert.equal(
      hasBelastbaarheidsSource([{ type: 'spreek_reportage', url: 'https://x/s.pdf' }]),
      true
    );
    assert.equal(
      hasSeparateBelastOrSpreekuurDoc([{ type: 'fml_izp', url: 'https://x/fml.pdf' }]),
      true
    );
  });

  it('is false for CV-only or docs without url', () => {
    assert.equal(hasBelastbaarheidsSource([{ type: 'cv', url: 'https://x/cv.pdf' }]), false);
    assert.equal(hasBelastbaarheidsSource([{ type: 'intakeformulier', url: null }]), false);
    assert.equal(hasBelastbaarheidsSource([]), false);
  });
});

describe('hasUsableBelastbaarheidsContent', () => {
  it('is false when rubrieken and prognose are empty → geen-profiel path', () => {
    assert.equal(
      hasUsableBelastbaarheidsContent({ rubrieken: [], prognose_citaat: null }),
      false
    );
    assert.equal(
      buildBelastbaarheidsprofielGeenProfielFields().prognose_bedrijfsarts,
      BELASTBAARHEID_GEEN_PROFIEL
    );
  });

  it('is true when only prognose quote is present', () => {
    assert.equal(
      hasUsableBelastbaarheidsContent({
        rubrieken: [],
        prognose_citaat: 'De prognose is gunstig.',
      }),
      true
    );
  });

  it('is true when only rubrieken are present', () => {
    assert.equal(
      hasUsableBelastbaarheidsContent({
        rubrieken: ['Werktijden'],
        prognose_citaat: null,
      }),
      true
    );
  });
});
