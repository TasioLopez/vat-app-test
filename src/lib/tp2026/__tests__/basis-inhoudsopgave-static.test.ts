import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASIS_INHOUDSOPGAVE_SECTIONS } from '@/lib/tp2026/basis-inhoudsopgave-static';

describe('BASIS_INHOUDSOPGAVE_SECTIONS', () => {
  it('lists Visie op plaatsbaarheid directly after Perspectief op werk', () => {
    const items = BASIS_INHOUDSOPGAVE_SECTIONS[0]?.items ?? [];
    const powIdx = items.indexOf('Perspectief op werk - POW-meter™');
    const plaatsIdx = items.indexOf('Visie op plaatsbaarheid');
    const vlbIdx = items.indexOf('Visie loopbaanadviseur');

    assert.ok(powIdx >= 0);
    assert.ok(plaatsIdx >= 0);
    assert.ok(vlbIdx >= 0);
    assert.equal(items.indexOf('Toelichting POW-meter™'), -1);
    assert.equal(plaatsIdx, powIdx + 1);
    assert.ok(plaatsIdx < vlbIdx);
  });
});
