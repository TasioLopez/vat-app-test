import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  blankIntakeSharedFacts,
  intakeSharedFacts,
  overlayIntakeWithWorkerFacts,
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
});
