import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adReportDateLabel,
  buildAdAdviesIntroPrefix,
  buildInleidingAdIntroPrefix,
  hasDefinitiveAdReport,
  hasIntakeAdNarrative,
  isAdReportConcept,
  normalizeAdReportConcept,
  patchAdviesIntroForConcept,
  patchInleidingAdIntroForConcept,
} from '@/lib/tp/ad-report-wording';

describe('normalizeAdReportConcept', () => {
  it('coerces truthy values to true and everything else to false', () => {
    assert.equal(normalizeAdReportConcept(true), true);
    assert.equal(normalizeAdReportConcept('true'), true);
    assert.equal(normalizeAdReportConcept(1), true);
    assert.equal(normalizeAdReportConcept('1'), true);
    assert.equal(normalizeAdReportConcept(false), false);
    assert.equal(normalizeAdReportConcept('false'), false);
    assert.equal(normalizeAdReportConcept(undefined), false);
    assert.equal(normalizeAdReportConcept(null), false);
    assert.equal(normalizeAdReportConcept(''), false);
  });
});

describe('isAdReportConcept', () => {
  it('is true only when ad_report_concept is true', () => {
    assert.equal(isAdReportConcept({ ad_report_concept: true }), true);
    assert.equal(isAdReportConcept({ ad_report_concept: false }), false);
    assert.equal(isAdReportConcept({}), false);
    assert.equal(isAdReportConcept({ ad_report_concept: null }), false);
  });
});

describe('hasDefinitiveAdReport', () => {
  it('is false when concept even if has_ad_report true', () => {
    assert.equal(hasDefinitiveAdReport({ has_ad_report: true, ad_report_concept: true }), false);
  });

  it('is true when definitive AD present', () => {
    assert.equal(hasDefinitiveAdReport({ has_ad_report: true, ad_report_concept: false }), true);
  });
});

describe('hasIntakeAdNarrative', () => {
  it('is true for concept or definitive AD', () => {
    assert.equal(hasIntakeAdNarrative({ ad_report_concept: true }), true);
    assert.equal(hasIntakeAdNarrative({ has_ad_report: true }), true);
    assert.equal(hasIntakeAdNarrative({ has_ad_report: false }), false);
  });
});

describe('adReportDateLabel', () => {
  it('adds concept prefix when flagged', () => {
    assert.equal(adReportDateLabel(false), 'Datum AD rapportage');
    assert.equal(adReportDateLabel(true), 'Datum concept AD rapportage');
  });
});

describe('intro prefixes', () => {
  it('builds advies intro prefix', () => {
    assert.equal(
      buildAdAdviesIntroPrefix(false),
      'In het arbeidsdeskundigrapport,'
    );
    assert.equal(
      buildAdAdviesIntroPrefix(true),
      'In het concept arbeidsdeskundigrapport,'
    );
  });

  it('builds inleiding intro prefix', () => {
    assert.equal(buildInleidingAdIntroPrefix(false), 'In het arbeidsdeskundig rapport');
    assert.equal(buildInleidingAdIntroPrefix(true), 'In het concept arbeidsdeskundig rapport');
  });
});

describe('patchAdviesIntroForConcept', () => {
  it('inserts and removes concept wording', () => {
    const standard =
      'In het arbeidsdeskundigrapport, opgesteld door S. Dijkstra, op 21 mei 2026 staat het volgende advies over passende arbeid:';
    const concept =
      'In het concept arbeidsdeskundigrapport, opgesteld door S. Dijkstra, op 21 mei 2026 staat het volgende advies over passende arbeid:';

    assert.equal(patchAdviesIntroForConcept(standard, true), concept);
    assert.equal(patchAdviesIntroForConcept(concept, false), standard);
    assert.equal(patchAdviesIntroForConcept(concept, true), concept);
  });
});

describe('patchInleidingAdIntroForConcept', () => {
  it('inserts and removes concept wording', () => {
    const standard =
      'In het arbeidsdeskundig rapport opgesteld door S. Dijkstra op 21 mei 2026 staat het volgende advies ten aanzien van het inzetten van een tweede spoor traject:';
    const concept =
      'In het concept arbeidsdeskundig rapport opgesteld door S. Dijkstra op 21 mei 2026 staat het volgende advies ten aanzien van het inzetten van een tweede spoor traject:';

    assert.equal(patchInleidingAdIntroForConcept(standard, true), concept);
    assert.equal(patchInleidingAdIntroForConcept(concept, false), standard);
  });
});
