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

  it('does not match VGR gesprek or other dossier types', () => {
    assert.equal(isGespreksverslagDocType('gespreksverslag_vgr'), false);
    assert.equal(isGespreksverslagDocType('intakeformulier'), false);
    assert.equal(isGespreksverslagDocType('ad_rapportage'), false);
    assert.equal(isGespreksverslagDocType('spreek_reportage'), false);
  });
});

describe('visibleEmployeeDocTypes', () => {
  it('hides gesprek slots outside staging and shows them on staging', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    assert.equal(visibleEmployeeDocTypes().includes('gespreksverslag'), false);
    assert.equal(visibleEmployeeDocTypes().includes('gespreksverslag_vgr'), false);
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    assert.equal(visibleEmployeeDocTypes().includes('gespreksverslag'), true);
    assert.equal(visibleEmployeeDocTypes().includes('gespreksverslag_vgr'), true);
    process.env.NEXT_PUBLIC_APP_ENV = prev;
  });

  it('shows aanmeldformulier on staging and production', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    assert.equal(visibleEmployeeDocTypes().includes('aanmeldformulier'), true);
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    assert.equal(visibleEmployeeDocTypes().includes('aanmeldformulier'), true);
    process.env.NEXT_PUBLIC_APP_ENV = prev;
  });
});
