import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectComputerFromIntakeText,
  detectDutchLevelsFromIntakeText,
} from '../intakeSectie17Text';

describe('detectComputerFromIntakeText', () => {
  it('reads level parenthetical and prefers Aanvullende programma\'s', () => {
    const text = `
Computervaardigheden
☐ Geen
☐ Basis (e-mailen en browsen)
☐ Gemiddeld (Word en Excel)
☒ Geavanceerd (meerdere programma's)
☐ Expert (IT-gerelateerde vaardigheden)
☐ Aanvullende programma's: SAP ERP, WMS (Warehouse Management Systeem)
Typvaardigheden
`;
    const result = detectComputerFromIntakeText(text);
    assert.equal(result?.computer_skills, '4');
    assert.equal(
      result?.computer_skills_description,
      'SAP ERP, WMS (Warehouse Management Systeem)'
    );
  });

  it('uses checked level parenthetical when no aanvullende line', () => {
    const text = `
Computervaardigheden
☒ Gemiddeld (Word en Excel)
☐ Geavanceerd (meerdere programma's)
Typvaardigheden
`;
    const result = detectComputerFromIntakeText(text);
    assert.equal(result?.computer_skills, '3');
    assert.equal(result?.computer_skills_description, 'Word en Excel');
  });
});

describe('detectDutchLevelsFromIntakeText', () => {
  it('maps G/R/O checkboxes to Goed/Voldoende/Matig', () => {
    const text = `
Nederlands
Spreken ☒ ☐ ☐
Schrijven ☐ ☒ ☐
Lezen ☐ ☐ ☒
Engels
`;
    const result = detectDutchLevelsFromIntakeText(text);
    assert.equal(result?.dutch_speaking, 'Goed');
    assert.equal(result?.dutch_writing, 'Voldoende');
    assert.equal(result?.dutch_reading, 'Matig');
  });

  it('maps all-unchecked triples to Geen', () => {
    const text = `
Nederlands
Spreken ☐ ☐ ☐
Schrijven ☐ ☐ ☐
Lezen ☐ ☐ ☐
Engels
`;
    const result = detectDutchLevelsFromIntakeText(text);
    assert.equal(result?.dutch_speaking, 'Geen');
    assert.equal(result?.dutch_writing, 'Geen');
    assert.equal(result?.dutch_reading, 'Geen');
  });
});
