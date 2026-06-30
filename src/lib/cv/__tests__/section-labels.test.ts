import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSectionTitle,
  isDefaultSectionTitle,
  resolveSectionTitleOverride,
} from '@/lib/cv/section-labels';

describe('section title helpers', () => {
  it('returns default title when no override', () => {
    assert.equal(getSectionTitle('profile', 'nl'), 'Profiel');
    assert.equal(getSectionTitle('experience', 'en'), 'Work experience');
  });

  it('uses custom override when set', () => {
    assert.equal(getSectionTitle('profile', 'nl', 'Samenvatting'), 'Samenvatting');
  });

  it('detects default titles in both locales', () => {
    assert.equal(isDefaultSectionTitle('experience', 'nl', 'Werkervaring'), true);
    assert.equal(isDefaultSectionTitle('experience', 'nl', 'Work experience'), true);
    assert.equal(isDefaultSectionTitle('experience', 'nl', 'Loopbaan'), false);
  });

  it('clears override when title matches default', () => {
    assert.equal(resolveSectionTitleOverride('profile', 'nl', 'Profiel'), undefined);
    assert.equal(resolveSectionTitleOverride('profile', 'nl', 'Samenvatting'), 'Samenvatting');
    assert.equal(resolveSectionTitleOverride('profile', 'nl', ''), undefined);
  });
});
