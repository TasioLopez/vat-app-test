import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASIS_INHOUDSOPGAVE_SECTIONS } from '@/lib/tp2026/basis-inhoudsopgave-static';

describe('BASIS_INHOUDSOPGAVE_SECTIONS', () => {
  it('lists Visie op plaatsbaarheid between Toelichting POW-meter and Visie loopbaanadviseur', () => {
    const items = BASIS_INHOUDSOPGAVE_SECTIONS[0]?.items ?? [];
    const toelichtingIdx = items.indexOf('Toelichting POW-meter™');
    const plaatsIdx = items.indexOf('Visie op plaatsbaarheid');
    const vlbIdx = items.indexOf('Visie loopbaanadviseur');

    assert.ok(toelichtingIdx >= 0);
    assert.ok(plaatsIdx >= 0);
    assert.ok(vlbIdx >= 0);
    assert.ok(toelichtingIdx < plaatsIdx);
    assert.ok(plaatsIdx < vlbIdx);
  });
});
