import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isComputerSkillsMetaDescription,
  normalizeStringArrayField,
  normalizeStringArrayFieldOrNull,
} from '@/lib/utils';

describe('normalizeStringArrayField', () => {
  it('parses JSON string arrays', () => {
    assert.deepEqual(normalizeStringArrayField('["B"]'), ['B']);
    assert.deepEqual(normalizeStringArrayField('["B","BE"]'), ['B', 'BE']);
  });

  it('unwraps nested JSON-ish array elements and dedupes', () => {
    assert.deepEqual(normalizeStringArrayField(['["B"]']), ['B']);
    assert.deepEqual(normalizeStringArrayField(['B', '["B"]']), ['B']);
    assert.deepEqual(normalizeStringArrayField('["[\\"B\\"]"]'), ['B']);
  });

  it('keeps plain codes and comma-separated legacy strings', () => {
    assert.deepEqual(normalizeStringArrayField('B'), ['B']);
    assert.deepEqual(normalizeStringArrayField('B, BE'), ['B', 'BE']);
    assert.deepEqual(normalizeStringArrayField(['B', 'BE']), ['B', 'BE']);
  });

  it('returns null variant for empty values', () => {
    assert.equal(normalizeStringArrayFieldOrNull(null), null);
    assert.equal(normalizeStringArrayFieldOrNull([]), null);
    assert.deepEqual(normalizeStringArrayFieldOrNull('["B"]'), ['B']);
  });
});

describe('isComputerSkillsMetaDescription', () => {
  it('detects placeholder descriptions', () => {
    assert.equal(isComputerSkillsMetaDescription('Computervaardigheden aanwezig'), true);
    assert.equal(isComputerSkillsMetaDescription('Algemene computervaardigheden'), true);
    assert.equal(isComputerSkillsMetaDescription('Word, Excel'), false);
    assert.equal(isComputerSkillsMetaDescription('e-mail, browsen'), false);
  });
});
