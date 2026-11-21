import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAbsentText } from '@/lib/utils';

describe('isAbsentText', () => {
  it('treats classic sentinels as absent', () => {
    assert.equal(isAbsentText(null), true);
    assert.equal(isAbsentText(''), true);
    assert.equal(isAbsentText('Geen'), true);
    assert.equal(isAbsentText('nee'), true);
    assert.equal(isAbsentText('n.v.t.'), true);
  });

  it('treats invented negative other_employers prose as absent', () => {
    assert.equal(isAbsentText('Geen Tweede Dienstverband Elders.'), true);
    assert.equal(isAbsentText('geen tweede dienstverband'), true);
    assert.equal(isAbsentText('Geen andere werkgever(s)'), true);
  });

  it('treats meta labels as absent', () => {
    assert.equal(isAbsentText('niet benoemd'), true);
    assert.equal(isAbsentText('Niet vermeld.'), true);
    assert.equal(isAbsentText('niet van toepassing'), true);
  });

  it('keeps real content that starts with Geen', () => {
    assert.equal(isAbsentText('Geen rijbewijs en beperkt ov.'), false);
    assert.equal(isAbsentText('PostNL'), false);
  });
});
