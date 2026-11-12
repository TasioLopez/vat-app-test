import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkerProfileView, type WorkerProfileView } from '../worker-profile-summary';

function row(view: WorkerProfileView, label: string) {
  return view.groups.flatMap((group) => group.rows).find((item) => item.label === label);
}

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
    assert.equal(row(view, 'Telefoon')?.value, '0611111111');
    assert.equal(row(view, 'Opleiding')?.value, 'HBO');
    assert.equal(row(view, 'E-mail'), undefined);
    assert.equal(row(view, 'Rijbewijs'), undefined);
    assert.equal(row(view, 'Ex-werknemer'), undefined);
    assert.equal(row(view, 'Werkervaring'), undefined);
    assert.equal(row(view, 'Andere werkgevers'), undefined);
  });

  it('is empty when only the name is known', () => {
    const view = buildWorkerProfileView({ firstName: 'Sam', lastName: 'Tester' });
    assert.equal(view.isEmpty, true);
    assert.deepEqual(view.groups, []);
  });

  it('puts job, werkgever and hours in the header and groups the remaining facts', () => {
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
      dutchSpeaking: 'Goed',
      dutchWriting: 'Goed',
      dutchReading: 'Goed',
      workExperience: 'Magazijn',
    });

    assert.equal(view.subtitle, 'Monteur bij Ihub · 32 uur');
    assert.equal(view.meta, null);
    assert.equal(row(view, 'Contactpersoon')?.value, 'Valerie Bloem');
    assert.equal(row(view, 'Dossier-eigenaar')?.value, 'AJ Staging');
    assert.equal(row(view, 'Opleiding')?.value, 'MBO 2 · Metaal');
    assert.equal(row(view, 'Computer')?.value, '3 - Gemiddeld, Word, Excel');
    assert.equal(row(view, 'Rijbewijs')?.value, 'B, BE');
    assert.equal(row(view, 'Ex-werknemer')?.value, 'Ja');
    assert.equal(row(view, 'Werkervaring')?.value, 'Magazijn');
    assert.equal(row(view, 'Nederlands')?.value, 'Spreken Goed · Schrijven Goed · Lezen Goed');
    assert.equal(row(view, 'Geboortedatum')?.value, '5 mei 1988');
    assert.equal(row(view, 'Contracturen'), undefined);
    assert.equal(row(view, 'PC'), undefined);
    assert.equal(view.groups.some((group) => group.id === 'nederlands'), true);
  });
});
