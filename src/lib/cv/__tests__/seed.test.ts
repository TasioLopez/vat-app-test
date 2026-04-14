import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStringArrayField } from '../seed';

describe('normalizeStringArrayField', () => {
  it('returns empty for null', () => {
    assert.deepEqual(normalizeStringArrayField(null), []);
  });

  it('passes through string arrays', () => {
    assert.deepEqual(normalizeStringArrayField(['B', 'C']), ['B', 'C']);
  });

  it('parses JSON array strings', () => {
    assert.deepEqual(normalizeStringArrayField('["B","D"]'), ['B', 'D']);
  });

  it('splits plain comma-separated strings', () => {
    assert.deepEqual(normalizeStringArrayField('B, C'), ['B', 'C']);
  });
});
