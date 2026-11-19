import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyGespreksverslagFactHints } from '@/lib/intake/gespreksverslag-fact-hints';

describe('applyGespreksverslagFactHints', () => {
  it('fills hours and Dutch from prose without inventing a license from Auto', () => {
    const text = `
De werknemer werkt 36 uur per week bij eHub.
De werknemer spreekt en schrijft Nederlands.
De werknemer heeft een eigen auto.
`;
    const next = applyGespreksverslagFactHints({}, text);
    assert.equal(next.s2.contract_hours, '36');
    assert.equal(next.s17.dutch_speaking, 'Goed');
    assert.equal(next.s17.dutch_writing, 'Goed');
    assert.deepEqual(next.s17.transport_types, ['Auto']);
    assert.deepEqual(next.s17.drivers_license_types, []);
  });

  it('does not overwrite existing hours or Dutch', () => {
    const next = applyGespreksverslagFactHints(
      { s2: { contract_hours: '32' }, s17: { dutch_speaking: 'Matig' } },
      'De werknemer werkt 36 uur per week. Hij spreekt en schrijft Nederlands.'
    );
    assert.equal(next.s2.contract_hours, '32');
    assert.equal(next.s17.dutch_speaking, 'Matig');
  });
});
