import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAndValidateEmployeeDetails } from '@/lib/document-analysis/nullSafeDetails';
import {
  normalizeEducationLevel,
  repairEmployeeEducationFields,
  splitEducationNameLevel,
} from '@/lib/tp2026/gegevens-field-options';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';

describe('normalizeEducationLevel', () => {
  it('maps MBO-2 to MBO 2', () => {
    assert.equal(normalizeEducationLevel('MBO-2'), 'MBO 2');
  });

  it('maps mbo 2 case-insensitively', () => {
    assert.equal(normalizeEducationLevel('mbo 2'), 'MBO 2');
  });

  it('maps MBO2 compact form', () => {
    assert.equal(normalizeEducationLevel('MBO2'), 'MBO 2');
  });

  it('keeps HBO as-is', () => {
    assert.equal(normalizeEducationLevel('HBO'), 'HBO');
  });

  it('returns undefined for invalid values', () => {
    assert.equal(normalizeEducationLevel('invalid'), undefined);
    assert.equal(normalizeEducationLevel(''), undefined);
    assert.equal(normalizeEducationLevel(null), undefined);
  });
});

describe('splitEducationNameLevel', () => {
  it('extracts level from education_name when level is empty', () => {
    const result = splitEducationNameLevel(undefined, 'MBO-2 Facilitaire Dienstverlening');
    assert.equal(result.level, 'MBO 2');
    assert.equal(result.name, 'Facilitaire Dienstverlening');
  });

  it('strips duplicate level prefix from name when both are set', () => {
    const result = splitEducationNameLevel('MBO 2', 'MBO-2 Facilitaire Dienstverlening');
    assert.equal(result.level, 'MBO 2');
    assert.equal(result.name, 'Facilitaire Dienstverlening');
  });
});

describe('repairEmployeeEducationFields', () => {
  it('repairs MBO-2 level and combined name', () => {
    const result = repairEmployeeEducationFields('MBO-2', 'MBO-2 Facilitaire Dienstverlening');
    assert.equal(result.education_level, 'MBO 2');
    assert.equal(result.education_name, 'Facilitaire Dienstverlening');
  });
});

describe('mapAndValidateEmployeeDetails education_level', () => {
  it('normalizes MBO-2 on autofill map', () => {
    const result = mapAndValidateEmployeeDetails({ education_level: 'MBO-2' });
    assert.equal(result.education_level, 'MBO 2');
  });
});

describe('ensureTP2026Shape education repair', () => {
  it('normalizes education_level in tp data', () => {
    const shaped = ensureTP2026Shape({
      education_level: 'MBO-2',
      education_name: 'MBO-2 Facilitaire Dienstverlening',
    });
    assert.equal(shaped.education_level, 'MBO 2');
    assert.equal(shaped.education_name, 'Facilitaire Dienstverlening');
  });
});
