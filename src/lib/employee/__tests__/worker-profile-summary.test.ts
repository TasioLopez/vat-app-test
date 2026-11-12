import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkerProfileView } from '../worker-profile-summary';

describe('buildWorkerProfileView', () => {
  it('hides empty facts and ordinary negatives', () => {
    const view = buildWorkerProfileView({
      firstName: 'Sam',
      lastName: 'Tester',
      email: '',
      phone: '0611111111',
      educationLevel: 'HBO',
      educationName: '',
      otherEmployers: 'Geen',
      driversLicense: false,
      hasComputer: false,
      isExWerknemer: false,
      workExperience: '   ',
    });

    assert.equal(view.name, 'Sam Tester');
    assert.equal(view.subtitle, null);
    assert.equal(view.isEmpty, false);
    assert.deepEqual(
      view.facts.map((fact) => `${fact.label}=${fact.value}`),
      ['Telefoon=0611111111', 'Opleiding=HBO']
    );
  });

  it('is empty when only the name is known', () => {
    const view = buildWorkerProfileView({ firstName: 'Sam', lastName: 'Tester' });
    assert.equal(view.isEmpty, true);
    assert.deepEqual(view.facts, []);
  });

  it('puts job and werkgever in the header and keeps real license and ex-werknemer', () => {
    const view = buildWorkerProfileView({
      currentJob: 'Monteur',
      clientName: 'Ihub',
      referentName: 'Valerie Bloem',
      ownerName: 'AJ Staging',
      educationLevel: 'MBO 2',
      educationName: 'Metaal',
      computerSkills: '3',
      computerSkillsDescription: 'Word, Excel',
      contractHours: 32,
      isExWerknemer: true,
      driversLicense: true,
      driversLicenseType: ['B', 'BE'],
      dateOfBirth: '1988-05-05',
      workExperience: 'Magazijn',
    });

    assert.equal(view.subtitle, 'Monteur · Ihub');
    assert.equal(view.meta, 'Contactpersoon Valerie Bloem · Eigenaar AJ Staging');
    assert.equal(view.facts.find((fact) => fact.label === 'Opleiding')?.value, 'MBO 2 · Metaal');
    assert.equal(view.facts.find((fact) => fact.label === 'Computer')?.value, '3 - Gemiddeld (Word, Excel)');
    assert.equal(view.facts.find((fact) => fact.label === 'Rijbewijs')?.value, 'B, BE');
    assert.equal(view.facts.find((fact) => fact.label === 'Ex-werknemer')?.value, 'Ja');
    assert.equal(view.facts.find((fact) => fact.label === 'Werkervaring')?.wide, true);
    assert.equal(view.facts.find((fact) => fact.label === 'PC'), undefined);
    assert.equal(view.facts.find((fact) => fact.label === 'Geboortedatum')?.value, '05-05-1988');
  });
});
