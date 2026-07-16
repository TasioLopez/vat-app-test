import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateIntakeAlgemeneInfoExtraction,
  validateIntakeCoreExtraction,
  validateMergedIntakeExtraction,
} from '../validateEmployeeExtraction';

describe('validateIntakeAlgemeneInfoExtraction', () => {
  it('accepts valid Melissa-like sectie 17 output', () => {
    const result = validateIntakeAlgemeneInfoExtraction(
      {
        education_level: 'HBO',
        education_name: 'Toerisme en recreatie',
        work_experience: 'passagiers assistent, operationele planner',
        transport_type: ['Auto'],
        dutch_speaking: 'Goed',
        computer_skills: '2',
      },
      { currentJob: 'Supervisor' }
    );
    assert.equal(result.ok, true);
  });

  it('rejects VCA as education_level', () => {
    const result = validateIntakeAlgemeneInfoExtraction({
      education_level: 'VCA',
      transport_type: ['Auto'],
      dutch_speaking: 'Goed',
      computer_skills: '2',
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /certificaat/i.test(e)));
  });

  it('rejects narrative work_experience garbage', () => {
    const result = validateIntakeAlgemeneInfoExtraction(
      {
        work_experience:
          'passagiers assistent, Heeft ook wel andere functies gedaan passagiers assistent',
        transport_type: ['Auto'],
        dutch_speaking: 'Goed',
        computer_skills: '2',
      },
      { currentJob: 'Supervisor' }
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /narratieve/i.test(e)));
  });

  it('rejects work_experience overlapping current_job', () => {
    const result = validateIntakeAlgemeneInfoExtraction(
      {
        work_experience: 'Supervisor',
        transport_type: ['Auto'],
        dutch_speaking: 'Goed',
        computer_skills: '2',
      },
      { currentJob: 'Supervisor' }
    );
    assert.equal(result.ok, false);
  });

  it('accepts empty transport_type (no boxes checked)', () => {
    const result = validateIntakeAlgemeneInfoExtraction({
      education_level: 'MBO 4',
      transport_type: [],
      dutch_speaking: 'Goed',
      computer_skills: '4',
    });
    assert.equal(result.ok, true);
  });
});

describe('validateIntakeCoreExtraction', () => {
  it('requires referent names when referent phone present', () => {
    const result = validateIntakeCoreExtraction({
      referent_phone: '0612345678',
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /referent_first_name/i.test(e)));
  });

  it('rejects bedrijfsarts as referent without contact', () => {
    const result = validateIntakeCoreExtraction({
      referent_first_name: 'Dr',
      referent_last_name: 'Test',
      referent_function: 'Bedrijfsarts',
    });
    assert.equal(result.ok, false);
  });
});

describe('validateMergedIntakeExtraction', () => {
  it('validates cross-field work vs current_job', () => {
    const result = validateMergedIntakeExtraction({
      current_job: 'Supervisor',
      work_experience: 'Supervisor',
      education_level: 'HBO',
      transport_type: ['Auto'],
      dutch_speaking: 'Goed',
      computer_skills: '2',
    });
    assert.equal(result.ok, false);
  });
});
