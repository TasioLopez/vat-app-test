import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDutchPhoneDisplay,
  formatPhoneForDisplay,
  normalizePhoneForStorage,
  toNationalDigits,
} from '../format-dutch-display';

describe('toNationalDigits', () => {
  it('normalizes +31 prefix', () => {
    assert.equal(toNationalDigits('+31612345678'), '0612345678');
  });

  it('strips non-digits', () => {
    assert.equal(toNationalDigits('06 - 12 34 56 78'), '0612345678');
  });
});

describe('formatDutchPhoneDisplay', () => {
  it('formats mobile numbers with spaced dash', () => {
    assert.equal(formatDutchPhoneDisplay('0612345678'), '06 - 12 34 56 78');
  });

  it('formats landline numbers with spaced dash', () => {
    assert.equal(formatDutchPhoneDisplay('0201234567'), '02 - 01 23 45 67');
  });

  it('formats +31 international input as Dutch national', () => {
    assert.equal(formatDutchPhoneDisplay('+31612345678'), '06 - 12 34 56 78');
  });

  it('re-formats old dash format to spaced dash', () => {
    assert.equal(formatDutchPhoneDisplay('06-12 34 56 78'), '06 - 12 34 56 78');
  });

  it('formats employee example number', () => {
    assert.equal(formatDutchPhoneDisplay('0629390338'), '06 - 29 39 03 38');
  });

  it('formats international +33 numbers', () => {
    assert.equal(formatDutchPhoneDisplay('+33686999710'), '+33 - 68 69 99 71 0');
  });

  it('returns trimmed input for too-short numbers', () => {
    assert.equal(formatDutchPhoneDisplay('12345'), '12345');
  });

  it('returns undefined for empty input', () => {
    assert.equal(formatDutchPhoneDisplay(''), undefined);
    assert.equal(formatDutchPhoneDisplay('   '), undefined);
  });
});

describe('normalizePhoneForStorage', () => {
  it('returns null for empty input', () => {
    assert.equal(normalizePhoneForStorage(''), null);
    assert.equal(normalizePhoneForStorage(null), null);
  });

  it('normalizes Dutch phone for storage', () => {
    assert.equal(normalizePhoneForStorage('0629390338'), '06 - 29 39 03 38');
  });
});

describe('formatPhoneForDisplay', () => {
  it('returns em dash for empty input', () => {
    assert.equal(formatPhoneForDisplay(''), '—');
  });
});
