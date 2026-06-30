import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  docsIncludeAdReport,
  hasFilledAdReportDate,
  resolveTp2HasAdReport,
} from '@/lib/tp/intake-ad-presence';

describe('docsIncludeAdReport', () => {
  it('detects AD document types', () => {
    assert.equal(docsIncludeAdReport([{ type: 'intakeformulier' }]), false);
    assert.equal(docsIncludeAdReport([{ type: 'ad_rapportage' }]), true);
  });
});

describe('hasFilledAdReportDate', () => {
  it('detects non-empty dates', () => {
    assert.equal(hasFilledAdReportDate('2026-05-21'), true);
    assert.equal(hasFilledAdReportDate(''), false);
    assert.equal(hasFilledAdReportDate(null), false);
  });
});

describe('resolveTp2HasAdReport', () => {
  it('sets has_ad_report true when AD document or date is present', () => {
    const withDoc: Record<string, unknown> = { ad_report_concept: true };
    resolveTp2HasAdReport(withDoc, true);
    assert.equal(withDoc.has_ad_report, true);
    assert.equal(withDoc.ad_report_concept, true);

    const withDateOnly: Record<string, unknown> = {
      ad_report_concept: true,
      ad_report_date: '2026-02-02',
    };
    resolveTp2HasAdReport(withDateOnly, false);
    assert.equal(withDateOnly.has_ad_report, true);
  });

  it('does not force has_ad_report false from concept flag alone', () => {
    const extracted: Record<string, unknown> = { ad_report_concept: true };
    resolveTp2HasAdReport(extracted, false);
    assert.equal(extracted.has_ad_report, false);
    assert.equal(extracted.ad_report_concept, true);
  });

  it('preserves explicit has_ad_report when no doc or date', () => {
    const extracted: Record<string, unknown> = { has_ad_report: true, ad_report_concept: false };
    resolveTp2HasAdReport(extracted, false);
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
