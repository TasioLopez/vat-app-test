import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareOrgUserDisplayName,
  formatOrgUserDisplayName,
  orgUsersById,
} from '../org-directory';

describe('formatOrgUserDisplayName', () => {
  it('joins first and last name', () => {
    assert.equal(
      formatOrgUserDisplayName({ first_name: 'Jan', last_name: 'Jansen', email: 'j@x.nl' }),
      'Jan Jansen'
    );
  });

  it('falls back to email when name empty', () => {
    assert.equal(
      formatOrgUserDisplayName({ first_name: null, last_name: '', email: 'j@x.nl' }),
      'j@x.nl'
    );
  });

  it('falls back to Naamloos when nothing set', () => {
    assert.equal(
      formatOrgUserDisplayName({ first_name: null, last_name: null, email: '' }),
      'Naamloos'
    );
  });
});

describe('compareOrgUserDisplayName', () => {
  it('sorts by visible display name A–Z (nl)', () => {
    const unsorted = [
      { first_name: 'Test', last_name: 'Backend', email: 't@x.nl' },
      { first_name: 'Bülent', last_name: 'Demir', email: 'b@x.nl' },
      { first_name: 'Arend-Jan', last_name: 'Mourits', email: 'a@x.nl' },
      { first_name: 'Jolien', last_name: 'Bergenhenegouwen', email: 'j@x.nl' },
    ];
    const sorted = [...unsorted].sort(compareOrgUserDisplayName).map(formatOrgUserDisplayName);
    assert.deepEqual(sorted, [
      'Arend-Jan Mourits',
      'Bülent Demir',
      'Jolien Bergenhenegouwen',
      'Test Backend',
    ]);
  });

  it('treats accented characters as base letters', () => {
    assert.ok(
      compareOrgUserDisplayName(
        { first_name: 'Bülent', last_name: 'Demir', email: 'b@x.nl' },
        { first_name: 'Bulent', last_name: 'Demir', email: 'b2@x.nl' }
      ) === 0
    );
  });
});

describe('orgUsersById', () => {
  it('indexes by id', () => {
    const map = orgUsersById([
      {
        id: 'a',
        first_name: 'A',
        last_name: 'B',
        email: 'a@x.nl',
        phone: null,
        role: 'user',
        status: 'confirmed',
      },
    ]);
    assert.equal(map.get('a')?.email, 'a@x.nl');
  });
});
