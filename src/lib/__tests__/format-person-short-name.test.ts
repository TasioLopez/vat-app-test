import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPersonShortName } from '../utils';

describe('formatPersonShortName', () => {
  it('converts full first name + last name to initial', () => {
    assert.equal(formatPersonShortName('Inge Beewen'), 'I. Beewen');
  });

  it('preserves Dutch particles in surname', () => {
    assert.equal(formatPersonShortName('Noortje van Mierlo'), 'N. van Mierlo');
  });

  it('leaves already-short names unchanged', () => {
    assert.equal(formatPersonShortName('V. Wolff'), 'V. Wolff');
    assert.equal(formatPersonShortName('R. Teegelaar'), 'R. Teegelaar');
  });

  it('strips honorific prefix before formatting', () => {
    assert.equal(formatPersonShortName('dhr. R. Teegelaar'), 'R. Teegelaar');
    assert.equal(formatPersonShortName('dhr. Inge Beewen'), 'I. Beewen');
  });

  it('returns single-token names as-is', () => {
    assert.equal(formatPersonShortName('Beewen'), 'Beewen');
  });

  it('handles empty input', () => {
    assert.equal(formatPersonShortName(''), '');
    assert.equal(formatPersonShortName(null), '');
  });
});
