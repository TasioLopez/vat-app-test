import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNoAdIntake,
  normalizeIntakeConcept,
  resolveTp2HasAdReport,
} from '../intake-ad-presence';

describe('normalizeIntakeConcept', () => {
  it('coerces truthy and falsy values', () => {
    assert.equal(normalizeIntakeConcept(true), true);
    assert.equal(normalizeIntakeConcept('true'), true);
    assert.equal(normalizeIntakeConcept(false), false);
    assert.equal(normalizeIntakeConcept('false'), false);
    assert.equal(normalizeIntakeConcept(undefined), undefined);
  });
});

describe('isNoAdIntake', () => {
  it('is true when concept checked or has_ad_report false', () => {
    assert.equal(isNoAdIntake({ intake_concept: true }), true);
    assert.equal(isNoAdIntake({ has_ad_report: false }), true);
    assert.equal(isNoAdIntake({ has_ad_report: true }), false);
  });
});

describe('resolveTp2HasAdReport', () => {
  it('forces has_ad_report false when concept intake', () => {
    const extracted: Record<string, unknown> = { intake_concept: true, ad_report_date: '2026-02-02' };
    resolveTp2HasAdReport(extracted, true);
    assert.equal(extracted.has_ad_report, false);
    assert.equal(extracted.intake_concept, true);
  });

  it('sets has_ad_report true when AD document present and not concept', () => {
    const extracted: Record<string, unknown> = { intake_concept: false };
    resolveTp2HasAdReport(extracted, true);
    assert.equal(extracted.has_ad_report, true);
  });

  it('infers has_ad_report from ad_report_date when no AD document', () => {
    const withDate: Record<string, unknown> = { ad_report_date: '2026-02-02' };
    resolveTp2HasAdReport(withDate, false);
    assert.equal(withDate.has_ad_report, true);

    const withoutDate: Record<string, unknown> = {};
    resolveTp2HasAdReport(withoutDate, false);
    assert.equal(withoutDate.has_ad_report, false);
  });
});
