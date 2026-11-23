import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeEmployeeFieldHash } from '@/lib/employee/field-review';
import {
  buildEmployeeProfileView,
  calculateAge,
  formatBirthDate,
  formatContractHours,
  type ProfileDetailsInput,
} from '@/lib/employee/profile-view';

const NOW = new Date(2026, 10, 13);

function rowsOf(view: ReturnType<typeof buildEmployeeProfileView>, groupId: string) {
  return view.groups.find((group) => group.id === groupId)?.rows ?? [];
}

describe('employee profile view', () => {
  it('formats birth date, age and contract hours', () => {
    assert.equal(calculateAge('1986-07-02', NOW), 40);
    assert.equal(calculateAge('1986-11-14', NOW), 39);
    assert.equal(calculateAge('not a date', NOW), null);
    assert.equal(formatBirthDate('1986-07-02', NOW), '2 juli 1986 (40 jaar)');
    assert.equal(formatBirthDate('onbekend', NOW), 'onbekend');
    assert.equal(formatContractHours(36.5), '36,5 uur per week');
    assert.equal(formatContractHours(24), '24 uur per week');
    assert.equal(formatContractHours(null), null);
  });

  it('builds the header from name, job, employer and contact facts', () => {
    const view = buildEmployeeProfileView({
      firstName: 'Melissa',
      lastName: 'Van der Leij-da Graça',
      email: 'mleij@outlook.com',
      clientName: 'Ihub',
      now: NOW,
      details: {
        gender: 'Vrouw',
        phone: '0623296151',
        date_of_birth: '1986-07-02',
        current_job: 'Leerkrachtondersteuner',
      },
    });

    assert.equal(view.name, 'Melissa Van der Leij-da Graça');
    assert.equal(view.initials, 'ML');
    assert.equal(view.subtitle, 'Leerkrachtondersteuner · Ihub');
    assert.deepEqual(
      view.headerFacts.map((fact) => [fact.id, fact.text, fact.href]),
      [
        ['gender', 'Vrouw', undefined],
        ['date_of_birth', '2 juli 1986 (40 jaar)', undefined],
        ['phone', '06 - 23 29 61 51', 'tel:0623296151'],
        ['email', 'mleij@outlook.com', 'mailto:mleij@outlook.com'],
      ]
    );
    assert.equal(view.exWerknemer, null);
  });

  it('shows only filled fields and lists the empty ones', () => {
    const view = buildEmployeeProfileView({
      firstName: 'Jan',
      lastName: 'Jansen',
      now: NOW,
      details: {
        current_job: 'Magazijnmedewerker',
        work_experience: 'Orderpicker, Heftruckchauffeur',
        education_level: 'MBO 2',
        transport_type: ['Auto', 'Fiets'],
        dutch_speaking: 'Goed',
        other_employers: 'Geen',
      },
    });

    assert.deepEqual(
      view.groups.map((group) => group.id),
      ['werk', 'opleiding', 'mobiliteit', 'taal_digitaal']
    );
    assert.deepEqual(
      rowsOf(view, 'werk').map((row) => row.id),
      ['current_job', 'work_experience']
    );
    assert.deepEqual(rowsOf(view, 'werk')[1].chips, ['Orderpicker', 'Heftruckchauffeur']);
    assert.deepEqual(rowsOf(view, 'mobiliteit')[0].chips, ['Auto', 'Fiets']);
    assert.equal(rowsOf(view, 'taal_digitaal')[0].text, 'Spreken goed');
    assert.deepEqual(view.emptyLabels, [
      'E-mail',
      'Telefoon',
      'Geslacht',
      'Geboortedatum',
      'Contracturen',
      'Specialisatie',
      'Schrijfvaardigheid',
      'Leesvaardigheid',
      'Computervaardigheden',
    ]);
    assert.equal(view.hasProfileFacts, true);
  });

  it('keeps long work experience as text instead of chips', () => {
    const long = 'Verantwoordelijk voor de dagelijkse planning van het magazijn en de expeditie';
    const view = buildEmployeeProfileView({ details: { work_experience: `${long}, Teamleider` } });
    const row = rowsOf(view, 'werk')[0];
    assert.deepEqual(row.chips, []);
    assert.equal(row.text, `${long}, Teamleider`);
  });

  it('hides an unasserted "no" and shows it once it has a review status', () => {
    const untouched = buildEmployeeProfileView({
      details: { drivers_license: false, has_computer: false, other_employers: 'Geen' },
    });
    assert.equal(untouched.groups.length, 0);
    assert.equal(untouched.hasProfileFacts, false);
    assert.equal(untouched.emptyLabels.includes('Rijbewijs'), false);

    const asserted = buildEmployeeProfileView({
      details: {
        drivers_license: false,
        has_computer: false,
        other_employers: 'Geen',
        field_review_status: {
          drivers_license: 'review',
          has_computer: 'review',
          other_employers: 'review',
        },
      },
    });
    assert.equal(rowsOf(asserted, 'mobiliteit')[0].text, 'Geen rijbewijs');
    assert.equal(rowsOf(asserted, 'taal_digitaal')[0].text, 'Nee');
    assert.equal(rowsOf(asserted, 'werk')[0].text, 'Geen');
    assert.equal(asserted.reviewCount, 3);
  });

  it('shows licence types as chips and falls back to Ja', () => {
    const typed = buildEmployeeProfileView({
      details: { drivers_license: true, drivers_license_type: ['B', 'BE'] },
    });
    assert.deepEqual(rowsOf(typed, 'mobiliteit')[0].chips, ['B', 'BE']);
    assert.equal(rowsOf(typed, 'mobiliteit')[0].text, null);

    const untyped = buildEmployeeProfileView({ details: { drivers_license: true } });
    assert.equal(rowsOf(untyped, 'mobiliteit')[0].text, 'Ja');
  });

  it('describes computer skills and computer ownership separately', () => {
    const view = buildEmployeeProfileView({
      details: { computer_skills: '3', has_computer: true },
    });
    assert.deepEqual(
      rowsOf(view, 'taal_digitaal').map((row) => [row.label, row.text]),
      [
        ['Computer', 'Gemiddeld (Word, Excel)'],
        ['Eigen pc', 'Ja'],
      ]
    );

    const none = buildEmployeeProfileView({ details: { computer_skills: '1' } });
    assert.equal(rowsOf(none, 'taal_digitaal')[0].text, 'Geen vaardigheden');
  });

  it('reports review and validated status per visible fact', () => {
    const details: ProfileDetailsInput = {
      gender: 'Man',
      current_job: 'Chauffeur',
      dutch_speaking: 'Goed',
      dutch_writing: 'Matig',
      is_ex_werknemer: true,
    };
    details.field_review_status = {
      gender: 'review',
      current_job: 'validated',
      dutch_speaking: 'validated',
      dutch_writing: 'review',
      is_ex_werknemer: 'review',
    };
    details.field_content_hash = {
      current_job: computeEmployeeFieldHash('current_job', details),
      dutch_speaking: computeEmployeeFieldHash('dutch_speaking', details),
    };

    const view = buildEmployeeProfileView({ details });

    assert.equal(view.headerFacts[0].status, 'review');
    assert.deepEqual(view.headerFacts[0].reviewFields, ['gender']);
    assert.equal(rowsOf(view, 'werk')[0].status, 'validated');
    const language = rowsOf(view, 'taal_digitaal')[0];
    assert.equal(language.status, 'review');
    assert.deepEqual(language.reviewFields, ['dutch_writing']);
    assert.equal(view.exWerknemer?.status, 'review');
    assert.equal(view.reviewCount, 3);
  });

  it('treats a changed validated value as review again', () => {
    const view = buildEmployeeProfileView({
      details: {
        current_job: 'Planner',
        field_review_status: { current_job: 'validated' },
        field_content_hash: {
          current_job: computeEmployeeFieldHash('current_job', { current_job: 'Chauffeur' }),
        },
      },
    });
    assert.equal(rowsOf(view, 'werk')[0].status, 'review');
  });

  it('handles a worker without any data', () => {
    const view = buildEmployeeProfileView({});
    assert.equal(view.name, 'Naamloze werknemer');
    assert.equal(view.initials, '');
    assert.equal(view.subtitle, null);
    assert.deepEqual(view.headerFacts, []);
    assert.deepEqual(view.groups, []);
    assert.equal(view.reviewCount, 0);
    assert.equal(view.emptyLabels.length, 14);
  });
});
