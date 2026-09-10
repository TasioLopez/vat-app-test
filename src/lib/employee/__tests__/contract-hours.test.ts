import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isIncompleteContractHoursInput,
  parseContractHours,
} from '../contract-hours';

describe('parseContractHours', () => {
  it('parses integers and decimals with dot or comma', () => {
    assert.equal(parseContractHours(36), 36);
    assert.equal(parseContractHours(36.5), 36.5);
    assert.equal(parseContractHours('36'), 36);
    assert.equal(parseContractHours('36.5'), 36.5);
    assert.equal(parseContractHours('36,5'), 36.5);
    assert.equal(parseContractHours(' 36,5 '), 36.5);
    assert.equal(parseContractHours('.5'), 0.5);
  });

  it('returns null for empty or invalid values', () => {
    assert.equal(parseContractHours(null), null);
    assert.equal(parseContractHours(undefined), null);
    assert.equal(parseContractHours(''), null);
    assert.equal(parseContractHours('   '), null);
    assert.equal(parseContractHours('.'), null);
    assert.equal(parseContractHours('abc'), null);
    assert.equal(parseContractHours(Number.NaN), null);
  });

  it('parses trailing decimal separator as the integer part', () => {
    assert.equal(parseContractHours('36.'), 36);
    assert.equal(parseContractHours('36,'), 36);
  });

  it('detects incomplete decimal typing', () => {
    assert.equal(isIncompleteContractHoursInput('36.'), true);
    assert.equal(isIncompleteContractHoursInput('36,'), true);
    assert.equal(isIncompleteContractHoursInput('.'), true);
    assert.equal(isIncompleteContractHoursInput('36.5'), false);
    assert.equal(isIncompleteContractHoursInput('36'), false);
  });
});
