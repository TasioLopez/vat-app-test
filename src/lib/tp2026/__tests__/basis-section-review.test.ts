import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TP2026_TP3_FIELD_ORDER } from '@/lib/autofill-progress';
import {
  BASIS_EDITOR_SECTIONS,
  BASIS_EDITOR_SECTION_IDS,
} from '@/lib/tp2026/basis-editor-sections';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';
import {
  applyAutofillReviewMarks,
  computeBasisSectionContentHash,
  getBasisSectionDisplayStatus,
  isBasisSectionEmpty,
  markBasisSectionReview,
  markBasisSectionValidated,
  withBasisSectionValidated,
  withBasisSectionReview,
} from '@/lib/tp2026/basis-section-review';

describe('BASIS_EDITOR_SECTIONS', () => {
  it('lists 11 editable sections without wettelijke_kaders or inleiding_sub', () => {
    assert.equal(BASIS_EDITOR_SECTIONS.length, 11);
    assert.equal(BASIS_EDITOR_SECTIONS[0]?.id, 'inleiding');
    assert.equal(BASIS_EDITOR_SECTIONS.at(-1)?.id, 'tp3_activities');
    assert.equal(BASIS_EDITOR_SECTIONS.some((s) => s.id === 'wettelijke_kaders'), false);
    assert.equal(BASIS_EDITOR_SECTIONS.some((s) => s.id === 'inleiding_sub'), false);
  });

  it('includes all TP3 autofill fields plus spoor2', () => {
    const ids = new Set(BASIS_EDITOR_SECTION_IDS);
    for (const field of TP2026_TP3_FIELD_ORDER) {
      assert.ok(ids.has(field));
    }
    assert.ok(ids.has('tp3_activities'));
  });
});

describe('isBasisSectionEmpty', () => {
  it('treats empty markdown as empty', () => {
    assert.equal(isBasisSectionEmpty('inleiding', {}), true);
    assert.equal(isBasisSectionEmpty('inleiding', { inleiding: '   ' }), true);
    assert.equal(isBasisSectionEmpty('inleiding', { inleiding: 'Tekst' }), false);
  });

  it('treats tp3_activities [] as empty and null as filled', () => {
    assert.equal(isBasisSectionEmpty('tp3_activities', { tp3_activities: [] }), true);
    assert.equal(isBasisSectionEmpty('tp3_activities', { tp3_activities: null }), false);
    assert.equal(isBasisSectionEmpty('tp3_activities', {}), false);
  });
});

describe('getBasisSectionDisplayStatus', () => {
  it('returns empty for empty markdown', () => {
    assert.equal(getBasisSectionDisplayStatus('zoekprofiel', {}), 'empty');
  });

  it('returns review for filled content without review map', () => {
    assert.equal(getBasisSectionDisplayStatus('inleiding', { inleiding: 'Hallo' }), 'review');
  });

  it('returns validated when flag and hash match', () => {
    const tpData = withBasisSectionValidated({ inleiding: 'Hallo' }, 'inleiding');
    assert.equal(getBasisSectionDisplayStatus('inleiding', tpData), 'validated');
  });

  it('returns review when validated content changes', () => {
    const validated = withBasisSectionValidated({ inleiding: 'Hallo' }, 'inleiding');
    assert.equal(getBasisSectionDisplayStatus('inleiding', { ...validated, inleiding: 'Gewijzigd' }), 'review');
  });

  it('returns review when validated flag exists but hash is missing', () => {
    assert.equal(
      getBasisSectionDisplayStatus('inleiding', {
        inleiding: 'Hallo',
        basis_section_review: { inleiding: 'validated' },
      }),
      'review'
    );
  });
});

describe('markBasisSectionReview', () => {
  it('sets review flag via updateField', () => {
    const updates: Record<string, unknown> = {};
    const updateField = (key: string, value: unknown) => {
      updates[key] = value;
    };

    markBasisSectionReview('visie_werknemer', 'review', { basis_section_review: { inleiding: 'validated' } }, updateField);

    assert.deepEqual(updates.basis_section_review, {
      inleiding: 'validated',
      visie_werknemer: 'review',
    });
  });
});

describe('markBasisSectionValidated', () => {
  it('stores content hash for markdown', () => {
    const updates: Record<string, unknown> = {};
    const updateField = (key: string, value: unknown) => {
      updates[key] = value;
    };
    const tpData = { inleiding: '  Hallo  ' };

    markBasisSectionValidated('inleiding', tpData, updateField);

    assert.deepEqual(updates.basis_section_review, { inleiding: 'validated' });
    assert.deepEqual(updates.basis_section_content_hash, {
      inleiding: computeBasisSectionContentHash('inleiding', tpData),
    });
    assert.equal((updates.basis_section_content_hash as Record<string, string>).inleiding, 'Hallo');
  });

  it('keeps validated status for identical content', () => {
    const tpData = { zoekprofiel: 'Profiel tekst' };
    const validated = withBasisSectionValidated(tpData, 'zoekprofiel');
    assert.equal(getBasisSectionDisplayStatus('zoekprofiel', validated), 'validated');
  });
});

describe('applyAutofillReviewMarks', () => {
  it('marks completed autofill sections as review', () => {
    const next = applyAutofillReviewMarks({ inleiding: 'x' }, ['inleiding', 'employee']);
    assert.deepEqual(next.basis_section_review, { inleiding: 'review' });
  });
});

describe('ensureTP2026Shape review normalization', () => {
  it('forces has_ad_report false when ad_report_concept is true', () => {
    const shaped = ensureTP2026Shape({
      has_ad_report: true,
      ad_report_concept: true,
    });
    assert.equal(shaped.has_ad_report, false);
    assert.equal(shaped.ad_report_concept, true);
  });

  it('strips unknown section ids from review maps', () => {
    const shaped = ensureTP2026Shape({
      basis_section_review: {
        inleiding: 'review',
        wettelijke_kaders: 'validated',
        unknown: 'review',
      },
      basis_section_content_hash: {
        inleiding: 'abc',
        inleiding_sub: 'def',
      },
    });

    assert.deepEqual(shaped.basis_section_review, { inleiding: 'review' });
    assert.deepEqual(shaped.basis_section_content_hash, { inleiding: 'abc' });
  });
});

describe('withBasisSectionReview', () => {
  it('merges review flags without dropping existing entries', () => {
    const next = withBasisSectionReview(
      { basis_section_review: { inleiding: 'validated' } },
      'zoekprofiel',
      'review'
    );
    assert.deepEqual(next.basis_section_review, {
      inleiding: 'validated',
      zoekprofiel: 'review',
    });
  });
});
