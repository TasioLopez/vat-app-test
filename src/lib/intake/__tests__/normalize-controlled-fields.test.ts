import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEmptyIntakeData } from '@/lib/intake/schema';
import { normalizeIntakeControlledFields } from '@/lib/intake/normalize-controlled-fields';

describe('normalizeIntakeControlledFields', () => {
  it('canonicalizes education_level Hbo to HBO', () => {
    const data = createEmptyIntakeData();
    data.s17.education_level = 'Hbo';
    const out = normalizeIntakeControlledFields(data);
    assert.equal(out.s17.education_level, 'HBO');
  });

  it('maps computer prose with Word/Excel to level 3 and keeps description', () => {
    const data = createEmptyIntakeData();
    data.s17.computer_skills = 'Kan redelijk overweg met Word en Excel.';
    data.s17.computer_skills_extra = '';
    const out = normalizeIntakeControlledFields(data);
    assert.equal(out.s17.computer_skills, '3');
    assert.match(out.s17.computer_skills_extra, /Word en Excel/i);
  });

  it('infers level 3 when only computer_skills_extra mentions Word/Excel', () => {
    const data = createEmptyIntakeData();
    data.s17.computer_skills = '';
    data.s17.computer_skills_extra = 'Word en Excel';
    const out = normalizeIntakeControlledFields(data);
    assert.equal(out.s17.computer_skills, '3');
    assert.equal(out.s17.computer_skills_extra, 'Word en Excel');
  });

  it('maps Redelijk computer label to level 3', () => {
    const data = createEmptyIntakeData();
    data.s17.computer_skills = 'Redelijk';
    const out = normalizeIntakeControlledFields(data);
    assert.equal(out.s17.computer_skills, '3');
  });

  it('clears invalid Dutch levels', () => {
    const data = createEmptyIntakeData();
    data.s17.dutch_speaking = 'Fluent';
    data.s17.dutch_writing = 'goed';
    data.s17.dutch_reading = '';
    const out = normalizeIntakeControlledFields(data);
    assert.equal(out.s17.dutch_speaking, '');
    assert.equal(out.s17.dutch_writing, 'Goed');
    assert.equal(out.s17.dutch_reading, '');
  });

  it('canonicalizes drivers license case and keeps Code 95', () => {
    const data = createEmptyIntakeData();
    data.s17.drivers_license_types = ['b', 'Code 95', 'INVALID'];
    data.s17.transport_types = ['Auto'];
    const out = normalizeIntakeControlledFields(data);
    assert.deepEqual(out.s17.drivers_license_types, ['B', 'Code 95']);
    assert.deepEqual(out.s17.transport_types, ['Auto']);
  });

  it('does not invent rijbewijs B from Auto alone', () => {
    const data = createEmptyIntakeData();
    data.s17.transport_types = ['Auto'];
    data.s17.drivers_license_types = [];
    const out = normalizeIntakeControlledFields(data);
    assert.deepEqual(out.s17.drivers_license_types, []);
    assert.deepEqual(out.s17.transport_types, ['Auto']);
  });
});
