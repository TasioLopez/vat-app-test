import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCvPayload } from '../normalize';

describe('normalizeCvPayload', () => {
  it('returns empty model for null', () => {
    const m = normalizeCvPayload(null);
    assert.equal(m.personal.fullName, '');
    assert.equal(m.profile, '');
    assert.deepEqual(m.experience, []);
  });

  it('merges known keys', () => {
    const m = normalizeCvPayload({
      personal: { fullName: 'A B', email: 'a@b.nl' },
      profile: 'Hello',
      experience: [{ id: '1', role: 'X' }],
    });
    assert.equal(m.personal.fullName, 'A B');
    assert.equal(m.personal.email, 'a@b.nl');
    assert.equal(m.profile, 'Hello');
    assert.equal(m.experience[0].role, 'X');
  });
});
