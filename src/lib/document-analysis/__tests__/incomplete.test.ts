import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAutofillCompleteness } from '../incomplete';

describe('getAutofillCompleteness', () => {
  it('returns incomplete false when intake not processed', () => {
    const r = getAutofillCompleteness({}, { intakeProcessed: false });
    assert.equal(r.incomplete, false);
    assert.equal(r.warnings.length, 0);
  });

  it('warns when intake processed but critical fields missing', () => {
    const r = getAutofillCompleteness(
      { current_job: 'Test' },
      { intakeProcessed: true }
    );
    assert.equal(r.incomplete, true);
    assert.ok(r.warnings.some((w) => w.field === 'transport_type'));
    assert.ok(r.warnings.some((w) => w.field === 'computer_skills'));
    assert.ok(r.warnings.some((w) => w.field === 'education_level'));
    assert.ok(r.warnings.some((w) => w.field === 'work_experience'));
  });

  it('warns with Dutch message when education_level missing', () => {
    const r = getAutofillCompleteness(
      {
        transport_type: ['Auto'],
        dutch_speaking: 'Goed',
        computer_skills: '2',
        work_experience: 'Assistent',
      },
      { intakeProcessed: true }
    );
    assert.equal(r.incomplete, true);
    const edu = r.warnings.find((w) => w.field === 'education_level');
    assert.ok(edu);
    assert.match(edu!.message, /Opleidingsniveau/i);
  });

  it('returns incomplete false when all critical fields present', () => {
    const r = getAutofillCompleteness(
      {
        transport_type: ['Auto'],
        dutch_speaking: 'Goed',
        computer_skills: '2',
        education_level: 'HBO',
        work_experience: 'Passagiers assistent',
      },
      { intakeProcessed: true }
    );
    assert.equal(r.incomplete, false);
  });
});
