import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkerProfileView } from '../worker-profile-summary';

describe('buildWorkerProfileView', () => {
  it('hides empty facts and keeps a false boolean', () => {
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
      workExperience: '   ',
    });

    assert.equal(view.name, 'Sam Tester');
    assert.equal(view.job, null);
    assert.equal(view.isEmpty, false);
    const labels = view.groups.flatMap((group) => group.facts.map((fact) => `${group.title}:${fact.label}=${fact.value}`));
    assert.deepEqual(labels, [
      'Contact:Telefoon=0611111111',
      'Opleiding:Opleiding=HBO',
      'Vervoer:Rijbewijs=Geen',
      'Taal en computer:PC=Nee',
    ]);
  });

  it('is empty when only the name is known', () => {
    const view = buildWorkerProfileView({ firstName: 'Sam', lastName: 'Tester' });
    assert.equal(view.isEmpty, true);
    assert.deepEqual(view.groups, []);
  });

  it('joins opleiding and shows computer skills that were written', () => {
    const view = buildWorkerProfileView({
      currentJob: 'Monteur',
      educationLevel: 'MBO 2',
      educationName: 'Metaal',
      computerSkills: '3',
      computerSkillsDescription: 'Word, Excel',
      contractHours: 32,
      isExWerknemer: true,
      dateOfBirth: '1988-05-05',
    });

    assert.equal(view.job, 'Monteur');
    const opleiding = view.groups.find((group) => group.title === 'Opleiding');
    assert.equal(opleiding?.facts[0].value, 'MBO 2 · Metaal');
    const language = view.groups.find((group) => group.title === 'Taal en computer');
    assert.equal(language?.facts[0].value, '3 - Gemiddeld (Word, Excel)');
    const work = view.groups.find((group) => group.title === 'Werk');
    assert.deepEqual(
      work?.facts.map((fact) => fact.value),
      ['32', 'Ja']
    );
    const contact = view.groups.find((group) => group.title === 'Contact');
    assert.equal(contact?.facts[0].value, '05-05-1988');
  });
});
