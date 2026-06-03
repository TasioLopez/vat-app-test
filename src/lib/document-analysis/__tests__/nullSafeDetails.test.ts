import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAndValidateEmployeeDetails } from '../nullSafeDetails';

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
});
