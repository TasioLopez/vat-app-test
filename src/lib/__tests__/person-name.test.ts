import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePersonName,
  formatTP2026CoverVoorName,
  formatEmployeeName,
  formatEmployeeNameWithoutPrefix,
} from '../utils';

describe('normalizePersonName', () => {
  it('trims leading and trailing whitespace', () => {
    assert.equal(normalizePersonName('  Calvin  '), 'Calvin');
  });

  it('returns null for empty or whitespace-only input', () => {
    assert.equal(normalizePersonName(''), null);
    assert.equal(normalizePersonName('   '), null);
    assert.equal(normalizePersonName(null), null);
    assert.equal(normalizePersonName(undefined), null);
  });
});

describe('formatTP2026CoverVoorName', () => {
  it('formats as lastName (firstName) without extra spaces', () => {
    assert.equal(
      formatTP2026CoverVoorName('Calvin ', 'van Lambaart '),
      'van Lambaart (Calvin)'
    );
  });

  it('returns em dash when both names are missing', () => {
    assert.equal(formatTP2026CoverVoorName('', ''), '—');
  });
});

describe('formatEmployeeName', () => {
  it('trims names in bracket format', () => {
    assert.equal(
      formatEmployeeName('Kim ', 'Baaijens ', 'Vrouw'),
      'Mevrouw K. Baaijens (Kim)'
    );
  });
});

describe('formatEmployeeNameWithoutPrefix', () => {
  it('trims names in bracket format', () => {
    assert.equal(
      formatEmployeeNameWithoutPrefix('Kim ', 'Baaijens ', 'Man'),
      'Baaijens (Kim)'
    );
  });
});
