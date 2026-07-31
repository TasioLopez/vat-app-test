import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTPProfileContext,
  getProfileWerkgeverName,
  getWerkgeverName,
  stripTPProfileFields,
  TP_PROFILE_LINKED_KEYS,
} from '../resolve-profile-context';

describe('applyTPProfileContext', () => {
  it('overwrites stale werkgever and referent snapshot values', () => {
    const data = {
      client_name: 'Old Employer BV',
      employer_name: 'Old Employer BV',
      client_referent_name: 'Old Contact',
      inleiding: 'TP-owned content',
    };
    const context = {
      employer_client_id: 'client-b',
      client_name: 'New Employer BV',
      employer_name: 'New Employer BV',
      client_referent_name: 'New Contact',
      client_referent_phone: '0612345678',
      client_referent_email: 'new@example.com',
      client_referent_function: 'HR',
      client_referent_gender: 'Vrouw',
    };

    const result = applyTPProfileContext(data, context);

    assert.equal(result.client_name, 'New Employer BV');
    assert.equal(result.employer_name, 'New Employer BV');
    assert.equal(result.client_referent_name, 'New Contact');
    assert.equal(result.inleiding, 'TP-owned content');
  });

  it('preserves document_employer_name when applying profile context', () => {
    const result = applyTPProfileContext(
      { document_employer_name: 'Short Name', client_name: 'Old' },
      { client_name: 'New Employer BV', employer_name: 'New Employer BV' }
    );
    assert.equal(result.document_employer_name, 'Short Name');
    assert.equal(result.client_name, 'New Employer BV');
  });
});

describe('stripTPProfileFields', () => {
  it('removes all profile-linked keys before persist', () => {
    const data: Record<string, unknown> = {
      client_name: 'Employer BV',
      employer_name: 'Employer BV',
      employer_client_id: 'client-1',
      client_referent_name: 'Contact',
      client_referent_phone: '0612345678',
      client_referent_email: 'c@example.com',
      client_referent_function: 'HR',
      client_referent_gender: 'Man',
      tp_start_date: '2026-01-01',
    };

    const result = stripTPProfileFields(data);

    for (const key of TP_PROFILE_LINKED_KEYS) {
      assert.equal(key in result, false, `expected ${key} to be stripped`);
    }
    assert.equal(result.tp_start_date, '2026-01-01');
  });

  it('keeps document_employer_name while stripping profile werkgever keys', () => {
    const result = stripTPProfileFields({
      client_name: 'Employer BV',
      employer_name: 'Employer BV',
      document_employer_name: 'Employer',
      tp_start_date: '2026-01-01',
    });

    assert.equal('client_name' in result, false);
    assert.equal('employer_name' in result, false);
    assert.equal(result.document_employer_name, 'Employer');
    assert.equal(result.tp_start_date, '2026-01-01');
  });
});

describe('getWerkgeverName', () => {
  it('prefers document_employer_name over profile names', () => {
    assert.equal(
      getWerkgeverName({
        document_employer_name: 'Short Name',
        client_name: 'Cordaan Holding BV',
        employer_name: 'Other',
      }),
      'Short Name'
    );
  });

  it('falls back to profile when document_employer_name is empty', () => {
    assert.equal(
      getWerkgeverName({
        document_employer_name: '   ',
        client_name: 'Cordaan',
      }),
      'Cordaan'
    );
  });

  it('prefers client_name over employer_name', () => {
    assert.equal(
      getWerkgeverName({ client_name: 'Cordaan', employer_name: 'Other' }),
      'Cordaan'
    );
  });

  it('falls back to employer_name when client_name is empty', () => {
    assert.equal(getWerkgeverName({ employer_name: 'Legacy Name' }), 'Legacy Name');
  });

  it('returns empty string when no werkgever is set', () => {
    assert.equal(getWerkgeverName({}), '');
  });

  it('title-cases werkgever names for display', () => {
    assert.equal(
      getWerkgeverName({ client_name: 'Axxicom airport caddy' }),
      'Axxicom Airport Caddy'
    );
  });

  it('preserves short uppercase acronyms in werkgever names', () => {
    assert.equal(
      getWerkgeverName({ client_name: 'cordaan BV' }),
      'Cordaan BV'
    );
  });
});

describe('getProfileWerkgeverName', () => {
  it('ignores document_employer_name', () => {
    assert.equal(
      getProfileWerkgeverName({
        document_employer_name: 'Short',
        client_name: 'Cordaan Holding BV',
      }),
      'Cordaan Holding BV'
    );
  });
});
