import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFmlDocumentType } from '../doc-type-matchers';

describe('isFmlDocumentType', () => {
  it('matches fml_izp combined type', () => {
    assert.equal(isFmlDocumentType('fml_izp'), true);
  });

  it('matches exact fml, izp, lab', () => {
    assert.equal(isFmlDocumentType('fml'), true);
    assert.equal(isFmlDocumentType('izp'), true);
    assert.equal(isFmlDocumentType('lab'), true);
  });

  it('does not match unrelated types', () => {
    assert.equal(isFmlDocumentType('intakeformulier'), false);
    assert.equal(isFmlDocumentType('ad_rapportage'), false);
    assert.equal(isFmlDocumentType('extra'), false);
  });
});
