import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  referentPayloadFromTpFields,
  referentPayloadHasContact,
} from '../referents';

describe('referentPayloadFromTpFields', () => {
  it('splits full name and normalizes phone/email', () => {
    const payload = referentPayloadFromTpFields({
      client_referent_name: 'Glenn Kuiper',
      client_referent_phone: '0634379655',
      client_referent_email: ' g.kuiper@middin.nl ',
    });

    assert.equal(payload.first_name, 'Glenn');
    assert.equal(payload.last_name, 'Kuiper');
    assert.equal(payload.phone, '06 - 34 37 96 55');
    assert.equal(payload.email, 'g.kuiper@middin.nl');
    assert.equal('referent_function' in payload, false);
  });

  it('includes optional profile fields when requested', () => {
    const payload = referentPayloadFromTpFields(
      {
        client_referent_name: 'A B',
        client_referent_function: 'HR',
        client_referent_gender: 'Man',
      },
      { includeOptionalProfileFields: true }
    );
    assert.equal(payload.referent_function, 'HR');
    assert.equal(payload.gender, 'Man');
  });

  it('detects empty contact payload', () => {
    assert.equal(
      referentPayloadHasContact(
        referentPayloadFromTpFields({
          client_referent_name: '  ',
          client_referent_phone: '',
          client_referent_email: null,
        })
      ),
      false
    );
    assert.equal(
      referentPayloadHasContact(
        referentPayloadFromTpFields({ client_referent_name: 'Kuiper' })
      ),
      true
    );
  });
});
