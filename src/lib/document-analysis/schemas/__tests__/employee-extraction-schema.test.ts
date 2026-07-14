import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEmployeeExtractionResult } from '../employee-extraction-schema';

describe('parseEmployeeExtractionResult', () => {
  it('strips null and empty string values', () => {
    const result = parseEmployeeExtractionResult({
      current_job: 'Supervisor',
      contract_hours: 36,
      gender: null,
      phone: '',
      transport_type: [],
      drivers_license_type: [],
    });

    assert.equal(result.current_job, 'Supervisor');
    assert.equal(result.contract_hours, 36);
    assert.equal('gender' in result, false);
    assert.equal('phone' in result, false);
    assert.equal('transport_type' in result, false);
  });

  it('keeps referent fields when present', () => {
    const result = parseEmployeeExtractionResult({
      referent_first_name: 'Jan',
      referent_last_name: 'Jansen',
      referent_function: null,
    });

    assert.equal(result.referent_first_name, 'Jan');
    assert.equal(result.referent_last_name, 'Jansen');
    assert.equal('referent_function' in result, false);
  });
});
