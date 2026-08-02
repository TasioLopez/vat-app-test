import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  coerceCvModelDisplay,
  coerceSkillBulletText,
  formatCvComputerSkills,
  formatCvDutchLanguageLevels,
} from '../format-display';

describe('formatCvComputerSkills', () => {
  it('formats numeric level in NL', () => {
    assert.match(formatCvComputerSkills('3'), /Gemiddeld/);
  });

  it('formats numeric level in EN', () => {
    assert.match(formatCvComputerSkills('3', 'en'), /Intermediate/);
  });

  it('uses custom description when provided', () => {
    assert.equal(
      formatCvComputerSkills('4', 'nl', 'SAP ERP, WMS'),
      'Geavanceerd (SAP ERP, WMS)'
    );
    assert.equal(
      formatCvComputerSkills('4', 'en', 'SAP ERP, WMS'),
      'Advanced (SAP ERP, WMS)'
    );
  });
});

describe('coerceSkillBulletText', () => {
  it('upgrades lone digit to label', () => {
    assert.match(coerceSkillBulletText('3'), /Gemiddeld/);
  });
});

describe('formatCvDutchLanguageLevels', () => {
  it('composes speak/write/read levels', () => {
    const level = formatCvDutchLanguageLevels('Goed', 'Matig', 'Goed');
    assert.ok(level);
    assert.match(level!, /spreek: Goed/);
    assert.match(level!, /schrijf: Matig/);
  });

  it('formats Voldoende and Geen', () => {
    const level = formatCvDutchLanguageLevels('Voldoende', 'Geen', 'Goed');
    assert.ok(level);
    assert.match(level!, /spreek: Voldoende/);
    assert.match(level!, /schrijf: Geen/);
  });

  it('maps legacy Gemiddeld/Niet goed to Voldoende/Matig', () => {
    const level = formatCvDutchLanguageLevels('Gemiddeld', 'Niet goed', 'Onvoldoende');
    assert.ok(level);
    assert.match(level!, /spreek: Voldoende/);
    assert.match(level!, /schrijf: Matig/);
    assert.match(level!, /lees: Matig/);
  });
});

describe('coerceCvModelDisplay', () => {
  it('moves numeric skill to digitalSkills', () => {
    const result = coerceCvModelDisplay({
      skills: [{ id: '1', text: '3' }],
      languages: [],
    });
    assert.match(result.digitalSkills ?? '', /Gemiddeld/);
    assert.equal(result.skills.length, 0);
  });
});
