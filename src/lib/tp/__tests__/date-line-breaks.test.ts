import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatNLDateForDoc, protectDutchDatesInText } from '../date-line-breaks';

const NBSP = '\u00A0';

function hasNbspBetweenParts(text: string): boolean {
  return text.includes(NBSP);
}

describe('protectDutchDatesInText', () => {
  it('replaces spaces in day-month-year dates', () => {
    const result = protectDutchDatesInText('gesproken op 1 juni 2026.');
    assert.match(result, /1.juni.2026/);
    assert.ok(hasNbspBetweenParts(result));
    assert.ok(!result.includes('1 juni 2026'));
  });

  it('replaces spaces in month-year dates', () => {
    const result = protectDutchDatesInText('periode eindigt in juni 2026.');
    assert.ok(result.includes(`juni${NBSP}2026`));
    assert.ok(!result.includes('juni 2026'));
  });

  it('is case-insensitive for month names', () => {
    const result = protectDutchDatesInText('Juni 2026');
    assert.ok(result.includes(`Juni${NBSP}2026`));
  });

  it('protects multiple dates in one string', () => {
    const result = protectDutchDatesInText('Van 1 juni 2026 tot 15 september 2026');
    assert.ok(result.includes(`1${NBSP}juni${NBSP}2026`));
    assert.ok(result.includes(`15${NBSP}september${NBSP}2026`));
  });

  it('leaves non-date text unchanged', () => {
    const input = 'Geen datum hier, alleen tekst.';
    assert.equal(protectDutchDatesInText(input), input);
  });
});

describe('formatNLDateForDoc', () => {
  it('returns em dash for empty input', () => {
    assert.equal(formatNLDateForDoc(null), '—');
    assert.equal(formatNLDateForDoc(''), '—');
  });

  it('formats ISO date with non-breaking spaces', () => {
    const result = formatNLDateForDoc('2026-06-01');
    assert.match(result, /2026/);
    assert.match(result, /juni/i);
    assert.ok(hasNbspBetweenParts(result));
  });
});
