import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  blankIntakeSharedFacts,
  intakeSharedFacts,
  overlayIntakeWithWorkerFacts,
  seedIntakeFromWorkerFacts,
} from '@/lib/intake/worker-overlay';

describe('intake worker overlay', () => {
  it('shows the worker record over a stale intake value and keeps interview text', () => {
    const opened = overlayIntakeWithWorkerFacts(
      {
        s17: {
          education_level: 'VMBO',
          praktische_belemmeringen: 'Reistijd.',
          bijzonderheden: 'Let op.',
        },
      },
      { education_level: 'HBO', email: 'nieuw@example.test' }
    );
    assert.equal(opened.s17.education_level, 'HBO');
    assert.equal(opened.s2.email, 'nieuw@example.test');
    assert.equal(opened.s17.praktische_belemmeringen, 'Reistijd.');
    assert.equal(opened.s17.bijzonderheden, 'Let op.');
  });

  it('does not blank a field the worker record does not contain', () => {
    const opened = overlayIntakeWithWorkerFacts(
      { s17: { education_level: 'MBO 2', computer_skills: 'Excel' } },
      { email: 'a@b.c' }
    );
    assert.equal(opened.s17.education_level, 'MBO 2');
    assert.equal(opened.s17.computer_skills, 'Excel');
    assert.equal(opened.s2.email, 'a@b.c');
  });

  it('stores intake JSON without the shared facts', () => {
    const stored = blankIntakeSharedFacts({
      s1: { employee_name: 'Sam Tester' },
      s17: { education_level: 'HBO', praktische_belemmeringen: 'Reistijd.' },
    });
    assert.equal(stored.s17.education_level, '');
    assert.equal(stored.s1.employee_name, '');
    assert.equal(stored.s17.praktische_belemmeringen, 'Reistijd.');
    assert.equal(intakeSharedFacts(stored).education_level, null);
  });

  it('promotes BA name+role into occupational_doctor_org for WorkerFacts', () => {
    const facts = intakeSharedFacts({
      s6: {
        doctor_role: 'BA',
        occupational_doctor_name: 'B. Droogleever',
        occupational_doctor_ad_name: 'I. Beewen',
      },
    });
    assert.equal(facts.occupational_doctor_org, 'Bedrijfsarts B. Droogleever');
    // AD name maps separately; must not replace BA org.
    assert.equal(facts.occupational_doctor_name, 'I. Beewen');
  });

  it('leaves occupational_doctor_org null when BA name and role are empty', () => {
    const facts = intakeSharedFacts({
      s6: { occupational_doctor_ad_name: 'Only AD' },
    });
    assert.equal(facts.occupational_doctor_org, null);
    assert.equal(facts.occupational_doctor_name, 'Only AD');
  });

  it('seeds known worker facts without blanking extracted gaps', () => {
    const seeded = seedIntakeFromWorkerFacts(
      {
        s17: {
          education_level: 'VMBO',
          dutch_speaking: 'Matig',
          drivers_license_types: ['C1'],
        },
      },
      {
        education_level: 'HBO',
        dutch_speaking: null,
        drivers_license: false,
        drivers_license_type: [],
      }
    );
    assert.equal(seeded.s17.education_level, 'HBO');
    // Unvalidated null dutch and false license must not wipe extraction.
    assert.equal(seeded.s17.dutch_speaking, 'Matig');
    assert.deepEqual(seeded.s17.drivers_license_types, ['C1']);
  });

  it('lets validated no-license clear extracted types', () => {
    const seeded = seedIntakeFromWorkerFacts(
      { s17: { drivers_license_types: ['C1'] } },
      { drivers_license: false, drivers_license_type: [] },
      { onlyKeys: new Set(['drivers_license', 'drivers_license_type']) }
    );
    assert.deepEqual(seeded.s17.drivers_license_types, []);
  });

  it('does not seed fake Dutch Geen over extracted levels', () => {
    const seeded = seedIntakeFromWorkerFacts(
      { s17: { dutch_speaking: 'Goed' } },
      { dutch_speaking: 'Geen' }
    );
    assert.equal(seeded.s17.dutch_speaking, 'Goed');
  });

  it('fills blank intake shared fields from chatlike WorkerFacts (hours/dutch/license)', () => {
    // After Invullen: narrative PDF may leave shared keys empty; chatlike WorkerFacts overlay fills them.
    const seeded = seedIntakeFromWorkerFacts(
      {
        s2: { contract_hours: '' },
        s17: {
          dutch_speaking: '',
          drivers_license_types: [],
          praktische_belemmeringen: 'Reistijd.',
        },
      },
      {
        contract_hours: 36,
        dutch_speaking: 'Goed',
        drivers_license: true,
        drivers_license_type: ['B'],
      }
    );
    assert.equal(seeded.s2.contract_hours, '36');
    assert.equal(seeded.s17.dutch_speaking, 'Goed');
    assert.deepEqual(seeded.s17.drivers_license_types, ['B']);
    assert.equal(seeded.s17.praktische_belemmeringen, 'Reistijd.');
  });
});
