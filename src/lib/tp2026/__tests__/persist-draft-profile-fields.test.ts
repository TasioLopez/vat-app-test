import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickGegevensTpMetaPayload } from '../persist-draft';
import { stripTPProfileFields } from '@/lib/tp/resolve-profile-context';
import { ensureTP2026Shape } from '../mapping';

describe('persist-draft profile-linked fields', () => {
  it('excludes referent keys from tp_meta payload', () => {
    const payload = pickGegevensTpMetaPayload(
      {
        client_referent_name: 'Should Not Persist',
        client_referent_phone: '0612345678',
        tp_start_date: '2026-01-01',
        tp3_activities: [],
      },
      'employee-1'
    );

    assert.equal(payload.employee_id, 'employee-1');
    assert.equal(payload.tp_start_date, '2026-01-01');
    assert.equal('client_referent_name' in payload, false);
    assert.equal('client_referent_phone' in payload, false);
  });

  it('strips werkgever and referent from shaped data_json before persist', () => {
    const shaped = stripTPProfileFields(
      ensureTP2026Shape({
        client_name: 'Employer BV',
        employer_name: 'Employer BV',
        client_referent_name: 'Contact',
        tp_end_date: '2027-01-01',
      })
    );

    assert.equal('client_name' in shaped, false);
    assert.equal('employer_name' in shaped, false);
    assert.equal('client_referent_name' in shaped, false);
    assert.equal(shaped.tp_end_date, '2027-01-01');
  });
});
