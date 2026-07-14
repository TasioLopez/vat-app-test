import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INTAKE_ALGEMENE_INFO_JSON_SCHEMA } from '../intake-algemene-info-schema';
import { INTAKE_CORE_JSON_SCHEMA } from '../intake-core-schema';

describe('INTAKE_ALGEMENE_INFO_JSON_SCHEMA', () => {
  it('includes HBO in education_level enum', () => {
    const level = INTAKE_ALGEMENE_INFO_JSON_SCHEMA.properties.education_level as {
      enum: readonly string[];
    };
    assert.ok(level.enum.includes('HBO'));
    assert.ok(level.enum.includes('MBO 4'));
    assert.ok(level.enum.includes(null as unknown as string));
  });
});

describe('INTAKE_CORE_JSON_SCHEMA', () => {
  it('does not include education fields', () => {
    assert.equal('education_level' in INTAKE_CORE_JSON_SCHEMA.properties, false);
    assert.equal('work_experience' in INTAKE_CORE_JSON_SCHEMA.properties, false);
  });

  it('includes referent fields', () => {
    assert.ok('referent_first_name' in INTAKE_CORE_JSON_SCHEMA.properties);
    assert.ok('referent_email' in INTAKE_CORE_JSON_SCHEMA.properties);
  });
});
