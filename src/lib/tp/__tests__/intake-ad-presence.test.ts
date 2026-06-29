import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  docsIncludeAdReport,
  isNoAdIntake,
  normalizeIntakeConcept,
  resolveEffectiveAdPresence,
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

describe('docsIncludeAdReport', () => {
  it('detects AD document types', () => {
    assert.equal(docsIncludeAdReport([{ type: 'ad_rapportage' }]), true);
    assert.equal(docsIncludeAdReport([{ type: 'intakeformulier' }]), false);
  });
});

describe('resolveEffectiveAdPresence', () => {
  it('sets has_ad_report true when AD document exists even if concept flagged', () => {
    const out = resolveEffectiveAdPresence({ intake_concept: true }, true);
    assert.equal(out.has_ad_report, true);
    assert.equal(out.intake_concept, true);
  });

  it('sets has_ad_report true from ad_report_date without AD document', () => {
    const out = resolveEffectiveAdPresence(
      { intake_concept: true, ad_report_date: '2026-05-21' },
      false
    );
    assert.equal(out.has_ad_report, true);
  });

  it('sets has_ad_report false for concept intake without AD evidence', () => {
    const out = resolveEffectiveAdPresence({ intake_concept: true }, false);
    assert.equal(out.has_ad_report, false);
  });
});

describe('isNoAdIntake', () => {
  it('is false when AD document or date evidence exists', () => {
    assert.equal(
      isNoAdIntake({ has_ad_report: false, ad_report_date: '2026-02-02' }),
      false
    );
    assert.equal(
      isNoAdIntake({ has_ad_report: false, intake_concept: true }, { hasAdDocument: true }),
      false
    );
  });

  it('is true when concept checked without AD evidence', () => {
    assert.equal(isNoAdIntake({ intake_concept: true }), true);
    assert.equal(isNoAdIntake({ has_ad_report: false }), true);
    assert.equal(isNoAdIntake({ has_ad_report: true }), false);
  });
});

describe('resolveTp2HasAdReport', () => {
  it('overrides concept when AD document or date is present', () => {
    const withDoc: Record<string, unknown> = { intake_concept: true, ad_report_date: '2026-02-02' };
    resolveTp2HasAdReport(withDoc, true);
    assert.equal(withDoc.has_ad_report, true);

    const withDateOnly: Record<string, unknown> = { intake_concept: true, ad_report_date: '2026-02-02' };
    resolveTp2HasAdReport(withDateOnly, false);
    assert.equal(withDateOnly.has_ad_report, true);
  });

  it('sets has_ad_report false for concept intake without AD evidence', () => {
    const extracted: Record<string, unknown> = { intake_concept: true };
    resolveTp2HasAdReport(extracted, false);
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
