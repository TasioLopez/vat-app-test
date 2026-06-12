import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sectionLayoutBadge, sectionLayoutClass } from '../layout-classes';

describe('sectionLayoutClass', () => {
  it('maps half to half width', () => {
    assert.match(sectionLayoutClass('half'), /w-1\/2/);
  });

  it('maps full to full width', () => {
    assert.match(sectionLayoutClass('full'), /w-full/);
  });
});

describe('sectionLayoutBadge', () => {
  it('returns short badges', () => {
    assert.equal(sectionLayoutBadge('half'), '½');
    assert.equal(sectionLayoutBadge('full'), 'Vol');
  });
});
