import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTAKE_ALGEMENE_INFO_JSON_SCHEMA,
  parseIntakeAlgemeneInfoExtractionResult,
  transportTypeFromCheckboxes,
} from '../intake-algemene-info-schema';
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

  it('uses per-checkbox transport booleans instead of a free-form array', () => {
    assert.ok('transport_auto' in INTAKE_ALGEMENE_INFO_JSON_SCHEMA.properties);
    assert.ok('transport_fiets' in INTAKE_ALGEMENE_INFO_JSON_SCHEMA.properties);
    assert.ok('transport_ov' in INTAKE_ALGEMENE_INFO_JSON_SCHEMA.properties);
    assert.ok('transport_lopend' in INTAKE_ALGEMENE_INFO_JSON_SCHEMA.properties);
    assert.equal('transport_type' in INTAKE_ALGEMENE_INFO_JSON_SCHEMA.properties, false);
  });
});

describe('transportTypeFromCheckboxes', () => {
  it('maps only true boxes to labels in order', () => {
    assert.deepEqual(
      transportTypeFromCheckboxes({
        transport_auto: true,
        transport_fiets: false,
        transport_ov: false,
        transport_lopend: false,
      }),
      ['Auto']
    );
    assert.deepEqual(
      transportTypeFromCheckboxes({
        transport_auto: true,
        transport_fiets: false,
        transport_ov: true,
        transport_lopend: false,
      }),
      ['Auto', 'OV']
    );
  });
});

describe('parseIntakeAlgemeneInfoExtractionResult', () => {
  it('builds transport_type from per-box booleans (Hippman-style Auto only)', () => {
    const result = parseIntakeAlgemeneInfoExtractionResult({
      education_level: 'MBO 4',
      transport_auto: true,
      transport_fiets: false,
      transport_ov: false,
      transport_lopend: false,
      dutch_speaking: 'Goed',
      computer_skills: '4',
    });
    assert.deepEqual(result.transport_type, ['Auto']);
    assert.equal('transport_auto' in result, false);
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
