import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isGespreksverslagDocType,
  isSpreekReportageDocType,
  visibleEmployeeDocTypes,
} from '../employee-doc-types';

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
    assert.equal(isSpreekReportageDocType('gespreksverslag'), false);
  });
});

describe('isGespreksverslagDocType', () => {
  it('matches the staging slug', () => {
    assert.equal(isGespreksverslagDocType('gespreksverslag'), true);
  });

  it('does not match intake, AD, or spreekuur types', () => {
    assert.equal(isGespreksverslagDocType('intakeformulier'), false);
    assert.equal(isGespreksverslagDocType('ad_rapportage'), false);
    assert.equal(isGespreksverslagDocType('spreek_reportage'), false);
  });
});

describe('visibleEmployeeDocTypes', () => {
  it('hides gespreksverslag outside staging and shows it on staging', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    assert.equal(visibleEmployeeDocTypes().includes('gespreksverslag'), false);
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    assert.equal(visibleEmployeeDocTypes().includes('gespreksverslag'), true);
    process.env.NEXT_PUBLIC_APP_ENV = prev;
  });
});
