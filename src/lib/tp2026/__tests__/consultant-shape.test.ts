import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ensureTP2026Shape } from '../mapping';

describe('ensureTP2026Shape consultant fields', () => {
  it('preserves consultant_* and consultant_user_id', () => {
    const shaped = ensureTP2026Shape({
      consultant_name: 'Ada Lovelace',
      consultant_phone: '0612345678',
      consultant_email: 'ada@example.nl',
      consultant_user_id: 'user-1',
      first_name: 'Jan',
      last_name: 'Jansen',
    });
    assert.equal(shaped.consultant_name, 'Ada Lovelace');
    assert.equal(shaped.consultant_email, 'ada@example.nl');
    assert.equal(shaped.consultant_user_id, 'user-1');
    assert.ok(String(shaped.consultant_phone || '').includes('06'));
  });
});
