import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processEmployeeAutofillRawDetails } from '@/lib/employee/autofill-persist';

describe('chatlike details → WorkerFacts persist shape', () => {
  it('normalizes typical chatlike mapped details for saveWorkerFacts autofill', () => {
    const processed = processEmployeeAutofillRawDetails({
      contract_hours: 36,
      dutch_speaking: 'Goed',
      drivers_license: true,
      drivers_license_type: ['B'],
      transport_type: 'OV',
      education_level: 'MBO 4',
      other_employers: 'n.v.t.',
    });
    assert.equal(processed.contract_hours, 36);
    assert.equal(processed.dutch_speaking, 'Goed');
    assert.equal(processed.drivers_license, true);
    assert.deepEqual(processed.drivers_license_type, ['B']);
    assert.deepEqual(processed.transport_type, ['OV']);
    assert.equal(processed.education_level, 'MBO 4');
    // Absent-text other_employers dropped so autofill does not invent Geen.
    assert.equal(Object.prototype.hasOwnProperty.call(processed, 'other_employers'), false);
  });
});
