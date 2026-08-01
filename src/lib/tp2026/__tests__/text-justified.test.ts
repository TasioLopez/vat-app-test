import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';

describe('ensureTP2026Shape text_justified', () => {
  it('keeps true when strictly true', () => {
    assert.equal(ensureTP2026Shape({ text_justified: true }).text_justified, true);
  });

  it('normalizes false', () => {
    assert.equal(ensureTP2026Shape({ text_justified: false }).text_justified, false);
  });

  it('defaults missing to false', () => {
    assert.equal(ensureTP2026Shape({}).text_justified, false);
  });

  it('rejects truthy non-boolean values', () => {
    assert.equal(ensureTP2026Shape({ text_justified: 'true' }).text_justified, false);
    assert.equal(ensureTP2026Shape({ text_justified: 1 }).text_justified, false);
  });
});
