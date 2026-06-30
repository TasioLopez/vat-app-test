import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSpreekReportageDocType } from '../employee-doc-types';

describe('isSpreekReportageDocType', () => {
  it('matches spreek_reportage slug', () => {
    assert.equal(isSpreekReportageDocType('spreek_reportage'), true);
  });

  it('matches spreekuurrapportage aliases', () => {
    assert.equal(isSpreekReportageDocType('spreekuurrapportage'), true);
    assert.equal(isSpreekReportageDocType('spreekuur_rapportage'), true);
  });

  it('does not match unrelated types', () => {
    assert.equal(isSpreekReportageDocType('ad_rapportage'), false);
    assert.equal(isSpreekReportageDocType('cv'), false);
  });
});
