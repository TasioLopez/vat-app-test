import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExWerknemerFromText,
  detectExWerknemerFromText,
  intakeTextHasExWerknemerLabel,
  isExWerknemer,
  normalizeExWerknemer,
} from '../ex-werknemer-wording';

describe('normalizeExWerknemer', () => {
  it('returns true only for explicit true-like values', () => {
    assert.equal(normalizeExWerknemer(true), true);
    assert.equal(normalizeExWerknemer('true'), true);
    assert.equal(normalizeExWerknemer(1), true);
    assert.equal(normalizeExWerknemer(false), false);
    assert.equal(normalizeExWerknemer(null), false);
    assert.equal(normalizeExWerknemer(undefined), false);
  });
});

describe('detectExWerknemerFromText', () => {
  it('detects checked Ex-werknemer checkbox', () => {
    assert.equal(detectExWerknemerFromText('☒ Ex-werknemer'), true);
    assert.equal(detectExWerknemerFromText('Ex-werknemer ☑'), true);
    assert.equal(detectExWerknemerFromText('[x] Ex-werknemer'), true);
  });

  it('detects unchecked Ex-werknemer checkbox', () => {
    assert.equal(detectExWerknemerFromText('☐ Ex-werknemer'), false);
    assert.equal(detectExWerknemerFromText('Ex-werknemer ☐'), false);
    assert.equal(detectExWerknemerFromText('[ ] Ex-werknemer'), false);
  });

  it('returns null when label or glyph state is unclear', () => {
    assert.equal(detectExWerknemerFromText(''), null);
    assert.equal(detectExWerknemerFromText('Geen ex-werknemer info'), null);
  });
});

describe('applyExWerknemerFromText', () => {
  it('prefers text detection over model', () => {
    assert.equal(applyExWerknemerFromText(true, false), false);
    assert.equal(applyExWerknemerFromText(false, true), true);
  });

  it('falls back to model true only when text is inconclusive', () => {
    assert.equal(applyExWerknemerFromText(true, null), true);
    assert.equal(applyExWerknemerFromText(false, null), false);
    assert.equal(applyExWerknemerFromText(null, null), false);
  });
});

describe('isExWerknemer', () => {
  it('is true only when flag is explicitly true', () => {
    assert.equal(isExWerknemer({ is_ex_werknemer: true }), true);
    assert.equal(isExWerknemer({ is_ex_werknemer: false }), false);
    assert.equal(isExWerknemer({}), false);
  });
});

describe('intakeTextHasExWerknemerLabel', () => {
  it('detects Ex-werknemer label in plain text', () => {
    assert.equal(intakeTextHasExWerknemerLabel('☐ Ex-werknemer'), true);
    assert.equal(intakeTextHasExWerknemerLabel('no label here'), false);
  });
});
