import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  describeIntakePlainText,
  hasCheckboxGlyphs,
} from '../documentPlainText';

describe('hasCheckboxGlyphs', () => {
  it('detects unicode and ascii checkbox marks', () => {
    assert.equal(hasCheckboxGlyphs('☒ Auto ☐ Fiets'), true);
    assert.equal(hasCheckboxGlyphs('[X] Auto [ ] Fiets'), true);
    assert.equal(hasCheckboxGlyphs('Auto Fiets OV'), false);
  });
});

describe('describeIntakePlainText', () => {
  it('flags section markers', () => {
    const meta = describeIntakePlainText(
      'Rijbewijzen\nHoe verplaatst werknemer zich:\n☒ Auto\nConcept ☐'
    );
    assert.equal(meta.hasHoeVerplaatst, true);
    assert.equal(meta.hasRijbewijzen, true);
    assert.equal(meta.hasCheckboxGlyphs, true);
    assert.equal(meta.hasConcept, true);
  });
});
