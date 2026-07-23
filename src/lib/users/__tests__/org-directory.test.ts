import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOrgUserDisplayName, orgUsersById } from '../org-directory';

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
