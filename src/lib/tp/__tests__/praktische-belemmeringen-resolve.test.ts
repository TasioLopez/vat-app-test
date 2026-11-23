import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRACTISCHE_BELEMMERINGEN_DEFAULT,
  resolvePraktischeBelemmeringenValue,
} from '@/lib/tp2026/mapping';

describe('resolvePraktischeBelemmeringenValue', () => {
  it('maps absent meta to the exact default sentence', () => {
    assert.equal(
      PRACTISCHE_BELEMMERINGEN_DEFAULT,
      'Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject.'
    );
    assert.equal(resolvePraktischeBelemmeringenValue(''), PRACTISCHE_BELEMMERINGEN_DEFAULT);
    assert.equal(resolvePraktischeBelemmeringenValue('niet benoemd'), PRACTISCHE_BELEMMERINGEN_DEFAULT);
    assert.equal(resolvePraktischeBelemmeringenValue('Geen'), PRACTISCHE_BELEMMERINGEN_DEFAULT);
  });

  it('keeps real barrier text', () => {
    assert.equal(
      resolvePraktischeBelemmeringenValue('Geen rijbewijs en beperkt ov.'),
      'Geen rijbewijs en beperkt ov.'
    );
  });
});
