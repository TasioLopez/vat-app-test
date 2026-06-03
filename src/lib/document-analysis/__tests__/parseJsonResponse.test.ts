import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { flattenExtractionPayload } from '../parseJsonResponse';
import { mapAndValidateEmployeeDetails } from '../nullSafeDetails';
import { extractReferentFromRaw } from '../nullSafeDetails';

describe('flattenExtractionPayload', () => {
  it('merges employee_details into root', () => {
    const flat = flattenExtractionPayload({
      employee_details: { contract_hours: 32, current_job: 'Verpleegkundige' },
    });
    assert.equal(flat.contract_hours, 32);
    assert.equal(flat.current_job, 'Verpleegkundige');
    assert.equal('employee_details' in flat, false);
  });

  it('maps nested referent keys to referent_* fields', () => {
    const flat = flattenExtractionPayload({
      referent: { first_name: 'Jan', last_name: 'Jansen', email: 'j@example.nl' },
    });
    assert.equal(flat.referent_first_name, 'Jan');
    assert.equal(flat.referent_last_name, 'Jansen');
    assert.equal(flat.referent_email, 'j@example.nl');
    assert.equal('referent' in flat, false);
  });

  it('nested employee_details maps through mapAndValidateEmployeeDetails', () => {
    const flat = flattenExtractionPayload({
      employee_details: { contract_hours: 32 },
    });
    const mapped = mapAndValidateEmployeeDetails(flat);
    assert.equal(mapped.contract_hours, 32);
  });

  it('extractReferentFromRaw reads nested referent object', () => {
    const ref = extractReferentFromRaw({
      referent: { first_name: 'Piet', phone: '0612345678' },
    });
    assert.equal(ref.referent_first_name, 'Piet');
    assert.equal(ref.referent_phone, '0612345678');
  });
});
