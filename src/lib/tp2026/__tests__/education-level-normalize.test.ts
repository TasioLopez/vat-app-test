import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAndValidateEmployeeDetails } from '@/lib/document-analysis/nullSafeDetails';
import { formatEducationLevel } from '@/lib/utils';
import {
  EDUCATION_LEVEL_OPTIONS,
  extractEducationLevelsInTextOrder,
  normalizeEducationLevel,
  parseIntakeEducationRows,
  repairEmployeeEducationFields,
  resolveEducationLevelFromIntake,
  resolveHighestFinishedEducation,
  sliceEducationSection,
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

  it('maps huishoudschool to Huishoudschool', () => {
    assert.equal(normalizeEducationLevel('huishoudschool'), 'Huishoudschool');
    assert.equal(normalizeEducationLevel('Huishoudschool'), 'Huishoudschool');
  });

  it('includes Huishoudschool in EDUCATION_LEVEL_OPTIONS', () => {
    assert.ok((EDUCATION_LEVEL_OPTIONS as readonly string[]).includes('Huishoudschool'));
  });

  it('returns undefined for invalid values', () => {
    assert.equal(normalizeEducationLevel('invalid'), undefined);
    assert.equal(normalizeEducationLevel(''), undefined);
    assert.equal(normalizeEducationLevel(null), undefined);
  });
});

describe('extractEducationLevelsInTextOrder', () => {
  it('returns levels in document order', () => {
    const text = 'Opleidingen? Afgerond? VMBO ja, later MBO 2 cursus';
    assert.deepEqual(extractEducationLevelsInTextOrder(text), ['VMBO', 'MBO 2']);
  });

  it('puts Huishoudschool before MBO 2 in table order', () => {
    const text = 'Huishoudschool afgerond\nMBO 2 Facilitaire dienstverlening';
    assert.deepEqual(extractEducationLevelsInTextOrder(text), ['Huishoudschool', 'MBO 2']);
  });
});

describe('sliceEducationSection', () => {
  it('extracts text from Opleidingen marker', () => {
    const text = 'Intro\nOpleidingen? Afgerond? VMBO\nPraktische belemmeringen: none';
    const section = sliceEducationSection(text);
    assert.match(section, /Opleidingen/i);
    assert.match(section, /VMBO/);
    assert.doesNotMatch(section, /Praktische belemmeringen/);
  });
});

describe('resolveEducationLevelFromIntake', () => {
  it('picks highest finished level from document text', () => {
    const rawText = `Opleidingen? Afgerond?
Huishoudschool Ja
MBO 4 Ja`;
    assert.equal(resolveEducationLevelFromIntake('Huishoudschool', rawText), 'MBO 4');
  });

  it('ignores unfinished studies', () => {
    const rawText = `Opleidingen? Afgerond?
VMBO Ja
MBO 2 Nee`;
    assert.equal(resolveEducationLevelFromIntake(undefined, rawText), 'VMBO');
  });

  it('returns undefined when only unfinished studies exist', () => {
    const rawText = `Opleidingen? Afgerond?
MBO 2 Nee`;
    assert.equal(resolveEducationLevelFromIntake(undefined, rawText), undefined);
  });

  it('treats inline afgerond as finished', () => {
    const rawText = 'Opleidingen? Afgerond? Huishoudschool afgerond\nMBO 2 cursus';
    assert.equal(resolveEducationLevelFromIntake(undefined, rawText), 'Huishoudschool');
  });
});

describe('parseIntakeEducationRows', () => {
  it('parses finished flags per row', () => {
    const rows = parseIntakeEducationRows(`Opleidingen? Afgerond?
VMBO Ja
MBO 2 Nee`);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.finished, true);
    assert.equal(rows[1]?.finished, false);
  });
});

describe('resolveHighestFinishedEducation', () => {
  it('returns highest finished row with specialization', () => {
    const result = resolveHighestFinishedEducation([
      { level: 'Huishoudschool', finished: true },
      { level: 'MBO 4', name: 'Verpleegkunde', finished: true },
    ]);
    assert.equal(result.education_level, 'MBO 4');
    assert.equal(result.education_name, 'Verpleegkunde');
  });
});

describe('formatEducationLevel', () => {
  it('returns Ongeschoold when no valid study', () => {
    assert.equal(formatEducationLevel(null, null), 'Ongeschoold');
    assert.equal(formatEducationLevel('', ''), 'Ongeschoold');
    assert.equal(formatEducationLevel('geen', null), 'Ongeschoold');
    assert.equal(formatEducationLevel('nee', null), 'Ongeschoold');
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

  it('clears invalid level tokens', () => {
    assert.deepEqual(repairEmployeeEducationFields('geen', 'VMBO'), {});
    assert.deepEqual(repairEmployeeEducationFields('nee', undefined), {});
    assert.deepEqual(repairEmployeeEducationFields('nei', undefined), {});
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
