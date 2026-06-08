import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSocialeAchtergrondFields,
  sanitizeFragment,
  stripCitations,
  type SocialeAchtergrondBuildContext,
} from '../build-fields';
import type { SocialeAchtergrondContentResult } from '../schema';

const baseCtx: SocialeAchtergrondBuildContext = {
  employee: { first_name: 'Kim', last_name: 'Baaijens' },
  details: { gender: 'Vrouw' },
};

const emptyContent = (): SocialeAchtergrondContentResult => ({
  alinea_1: null,
  alinea_2: null,
  alinea_3: null,
});

describe('buildSocialeAchtergrondFields', () => {
  it('joins three synthesized paragraphs with double newlines', () => {
    const content: SocialeAchtergrondContentResult = {
      alinea_1: 'Werknemer woont samen met haar partner en kind in Zaandam.',
      alinea_2: 'Werknemer regelt het huishouden grotendeels zelfstandig.',
      alinea_3: 'In haar vrije tijd verkoopt werknemer tweedehands babykleding via Vinted.',
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    const parts = sociale_achtergrond.split('\n\n');
    assert.equal(parts.length, 3);
    assert.match(parts[0], /Zaandam/);
    assert.match(parts[1], /huishouden/);
    assert.match(parts[2], /Vinted/);
  });

  it('omits null alineas', () => {
    const content: SocialeAchtergrondContentResult = {
      alinea_1: 'Werknemer woont alleen.',
      alinea_2: null,
      alinea_3: 'Werknemer leest graag.',
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    const parts = sociale_achtergrond.split('\n\n');
    assert.equal(parts.length, 2);
    assert.match(parts[0], /woont alleen/);
    assert.match(parts[1], /leest graag/);
  });

  it('returns empty string when all alineas are null', () => {
    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, emptyContent());
    assert.equal(sociale_achtergrond, '');
  });

  it('preserves synthesized paragraph as-is without concatenating extra sentences', () => {
    const content: SocialeAchtergrondContentResult = {
      alinea_1:
        'Werknemer woont samen met haar partner en kind. Zij heeft een sociaal netwerk van familie en vrienden.',
      alinea_2: null,
      alinea_3: null,
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    assert.equal(sociale_achtergrond.split('\n\n').length, 1);
    assert.equal(sociale_achtergrond.split('.').filter(Boolean).length, 2);
  });

  it('collapses internal newlines within a paragraph', () => {
    const content: SocialeAchtergrondContentResult = {
      alinea_1: 'Werknemer woont alleen.\n\nZij heeft contact met familie.',
      alinea_2: null,
      alinea_3: null,
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    assert.ok(!sociale_achtergrond.includes('\n\n\n'));
    assert.match(sociale_achtergrond, /woont alleen.*contact met familie/);
  });
});

describe('sanitizeFragment', () => {
  it('strips citations', () => {
    assert.equal(stripCitations('Tekst [1:2/intake.pdf] verder'), 'Tekst verder');
  });

  it('removes banned phrases', () => {
    const cleaned = sanitizeFragment('Werknemer geeft aan dat zij graag wandelt');
    assert.ok(!cleaned.toLowerCase().includes('werknemer geeft aan'));
    assert.match(cleaned, /wandelt/i);
  });
});

describe('parseSocialeAchtergrondContentResult', () => {
  it('coerces empty strings to null', async () => {
    const { parseSocialeAchtergrondContentResult } = await import('../schema');
    const result = parseSocialeAchtergrondContentResult({
      alinea_1: '  ',
      alinea_2: 'Tekst',
      alinea_3: '',
    });
    assert.equal(result.alinea_1, null);
    assert.equal(result.alinea_2, 'Tekst');
    assert.equal(result.alinea_3, null);
  });
});
