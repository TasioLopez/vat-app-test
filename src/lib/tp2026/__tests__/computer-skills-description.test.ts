import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatComputerSkillsDisplay,
  getComputerSkillsDefaultDescription,
  nextComputerSkillsDescriptionOnLevelChange,
} from '../gegevens-field-options';
import { formatComputerSkills } from '@/lib/utils';
import { GEGEVENS_EMPLOYEE_KEYS } from '../gegevens-autofill';
import { EMPLOYEE_DETAILS_PERSIST_KEYS } from '@/lib/employee/autofill-persist';

describe('computer skills description helpers', () => {
  it('formats level with default description', () => {
    assert.equal(formatComputerSkills('2'), 'Basis (e-mail, browsen)');
    assert.equal(formatComputerSkillsDisplay('4'), "Geavanceerd (meerdere programma's)");
  });

  it('prefers custom description over default', () => {
    assert.equal(
      formatComputerSkills('4', 'SAP ERP, WMS'),
      'Geavanceerd (SAP ERP, WMS)'
    );
  });

  it('resets description when still on previous default', () => {
    assert.equal(
      nextComputerSkillsDescriptionOnLevelChange('2', '3', 'e-mail, browsen'),
      'Word, Excel'
    );
  });

  it('keeps custom description when level changes', () => {
    assert.equal(
      nextComputerSkillsDescriptionOnLevelChange('4', '3', 'SAP ERP, WMS'),
      'SAP ERP, WMS'
    );
  });

  it('returns empty default for Geen', () => {
    assert.equal(getComputerSkillsDefaultDescription('1'), '');
    assert.equal(formatComputerSkills('1'), 'Geen');
  });

  it('includes computer_skills_description in mirror/persist keys', () => {
    assert.ok(GEGEVENS_EMPLOYEE_KEYS.includes('computer_skills_description'));
    assert.ok(EMPLOYEE_DETAILS_PERSIST_KEYS.includes('computer_skills_description'));
  });
});
