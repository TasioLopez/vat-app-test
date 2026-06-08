import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapAndValidateEmployeeDetails,
  extractReferentFromRaw,
  splitContactPersonName,
} from '../nullSafeDetails';

describe('mapAndValidateEmployeeDetails', () => {
  it('returns empty object for empty input', () => {
    assert.deepEqual(mapAndValidateEmployeeDetails({}), {});
  });

  it('does not invent transport_type, drivers_license, or computer_skills', () => {
    const result = mapAndValidateEmployeeDetails({
      current_job: 'Verzorgende A',
    });
    assert.equal(result.current_job, 'Verzorgende A');
    assert.equal('transport_type' in result, false);
    assert.equal('drivers_license' in result, false);
    assert.equal('computer_skills' in result, false);
  });

  it('omits empty transport_type array', () => {
    const result = mapAndValidateEmployeeDetails({ transport_type: [] });
    assert.equal('transport_type' in result, false);
  });

  it('maps transport_type when non-empty', () => {
    const result = mapAndValidateEmployeeDetails({ transport_type: ['Auto', 'OV'] });
    assert.deepEqual(result.transport_type, ['Auto', 'OV']);
  });

  it('coerces computer_skills number to string', () => {
    const result = mapAndValidateEmployeeDetails({ computer_skills: 3 });
    assert.equal(result.computer_skills, '3');
  });

  it('maps dutch O level to Niet goed', () => {
    const result = mapAndValidateEmployeeDetails({
      dutch_speaking: 'O',
      dutch_writing: 'onvoldoende',
      dutch_reading: 'G',
    });
    assert.equal(result.dutch_speaking, 'Niet goed');
    assert.equal(result.dutch_writing, 'Niet goed');
    assert.equal(result.dutch_reading, 'Goed');
  });

  it('skips referent fields from employee details', () => {
    const result = mapAndValidateEmployeeDetails({
      referent_first_name: 'Herleen',
      referent_last_name: 'Brama',
    });
    assert.equal('referent_first_name' in result, false);
  });

  it('formats phone from telefoonnummer alias', () => {
    const result = mapAndValidateEmployeeDetails({ telefoonnummer: '0612345678' });
    assert.equal(result.phone, '06-12 34 56 78');
  });
});

describe('extractReferentFromRaw', () => {
  it('formats referent_phone', () => {
    const ref = extractReferentFromRaw({ referent_phone: '0612345678' });
    assert.equal(ref.referent_phone, '06-12 34 56 78');
  });

  it('splits naam_contactpersoon when first/last missing', () => {
    const ref = extractReferentFromRaw({
      naam_contactpersoon: 'Herleen Brama',
      referent_function: 'HR adviseur',
      referent_phone: '0612345678',
    });
    assert.equal(ref.referent_first_name, 'Herleen');
    assert.equal(ref.referent_last_name, 'Brama');
  });

  it('rejects likely wrong referent without contact info', () => {
    const ref = extractReferentFromRaw({
      referent_first_name: 'Jan',
      referent_last_name: 'AD',
      referent_function: 'Arbeidsdeskundige',
    });
    assert.deepEqual(ref, {});
  });
});

describe('splitContactPersonName', () => {
  it('splits full name into first and last', () => {
    assert.deepEqual(splitContactPersonName('Herleen Brama'), {
      first_name: 'Herleen',
      last_name: 'Brama',
    });
  });
});
