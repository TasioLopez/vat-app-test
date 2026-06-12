import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStringArrayField, seedCvModelFromEmployee } from '../seed';

describe('normalizeStringArrayField', () => {
  it('returns empty for null', () => {
    assert.deepEqual(normalizeStringArrayField(null), []);
  });

  it('passes through string arrays', () => {
    assert.deepEqual(normalizeStringArrayField(['B', 'C']), ['B', 'C']);
  });

  it('parses JSON array strings', () => {
    assert.deepEqual(normalizeStringArrayField('["B","D"]'), ['B', 'D']);
  });

  it('splits plain comma-separated strings', () => {
    assert.deepEqual(normalizeStringArrayField('B, C'), ['B', 'C']);
  });
});

describe('seedCvModelFromEmployee', () => {
  it('puts formatted computer skills in digitalSkills not skills', () => {
    const model = seedCvModelFromEmployee(
      { first_name: 'Jan', last_name: 'Jansen' },
      { computer_skills: '3', current_job: 'Developer' }
    );
    assert.match(model.digitalSkills ?? '', /Gemiddeld/);
    assert.ok(!model.skills.some((s) => s.text === '3'));
  });

  it('seeds single Nederlands language row with level', () => {
    const model = seedCvModelFromEmployee(
      { first_name: 'Jan' },
      { dutch_speaking: 'Goed', dutch_writing: 'Matig', dutch_reading: 'Goed' }
    );
    assert.equal(model.languages.length, 1);
    assert.equal(model.languages[0].language, 'Nederlands');
    assert.ok(model.languages[0].level?.includes('spreek'));
  });
});
