import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDutchPhoneDisplay, toNationalDigits } from '../format-dutch-display';

describe('toNationalDigits', () => {
  it('normalizes +31 prefix', () => {
    assert.equal(toNationalDigits('+31612345678'), '0612345678');
  });

  it('strips non-digits', () => {
    assert.equal(toNationalDigits('06-12 34 56 78'), '0612345678');
  });
});

describe('formatDutchPhoneDisplay', () => {
  it('formats mobile numbers', () => {
    assert.equal(formatDutchPhoneDisplay('0612345678'), '06-12 34 56 78');
  });

  it('formats landline numbers', () => {
    assert.equal(formatDutchPhoneDisplay('0201234567'), '02-01 23 45 67');
  });

  it('formats +31 international input', () => {
    assert.equal(formatDutchPhoneDisplay('+31612345678'), '06-12 34 56 78');
  });

  it('leaves already formatted value unchanged when re-parsed', () => {
    assert.equal(formatDutchPhoneDisplay('06-12 34 56 78'), '06-12 34 56 78');
  });

  it('returns trimmed input for too-short numbers', () => {
    assert.equal(formatDutchPhoneDisplay('12345'), '12345');
  });

  it('returns undefined for empty input', () => {
    assert.equal(formatDutchPhoneDisplay(''), undefined);
    assert.equal(formatDutchPhoneDisplay('   '), undefined);
  });
});
