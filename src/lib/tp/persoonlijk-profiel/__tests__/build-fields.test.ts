import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersoonlijkProfielFields,
  calculateAge,
  hasValidOpening,
  stripCitations,
  type PersoonlijkProfielBuildContext,
} from '../build-fields';
import type { PersoonlijkProfielContentResult } from '../schema';

const baseCtx: PersoonlijkProfielBuildContext = {
  employee: { first_name: 'Kim', last_name: 'Baaijens' },
  details: { gender: 'Vrouw', date_of_birth: '1985-03-15' },
};

describe('buildPersoonlijkProfielFields', () => {
  it('joins three alinea paragraphs with double newlines', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 58-jarige vrouw met circa vijf jaar werkervaring als huishoudelijk ondersteuner. Werknemer heeft de mavo afgerond.',
      alinea_2:
        'Werknemer beschikt over rijbewijs B. De Nederlandse taal beheerst werknemer goed in spreken, lezen en schrijven.',
      alinea_3: 'Werknemer wordt omschreven als nauwkeurig en klantgericht.',
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    const parts = persoonlijk_profiel.split('\n\n');
    assert.equal(parts.length, 3);
    assert.match(parts[0], /58-jarige vrouw/);
    assert.match(parts[1], /rijbewijs B/);
    assert.match(parts[2], /nauwkeurig/);
  });

  it('returns two paragraphs when alinea_3 is null', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 41-jarige vrouw met ruim twintig jaar werkervaring als docent.',
      alinea_2: 'Werknemer verplaatst zich voornamelijk per fiets.',
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.equal(persoonlijk_profiel.split('\n\n').length, 2);
  });

  it('returns empty string when all alineas are null', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1: null,
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.equal(persoonlijk_profiel, '');
  });

  it('strips accidental section heading from alinea text', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Persoonlijk profiel Werknemer is een 50-jarige man met tien jaar werkervaring als magazijnmedewerker.',
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.ok(!persoonlijk_profiel.startsWith('Persoonlijk profiel'));
    assert.match(persoonlijk_profiel, /50-jarige man/);
  });

  it('collapses internal newlines within a paragraph', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 45-jarige vrouw met ervaring als verpleegkundige.\n\nWerknemer heeft mbo-4 afgerond.',
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.ok(!persoonlijk_profiel.includes('\n\n\n'));
    assert.match(persoonlijk_profiel, /verpleegkundige.*mbo-4/);
  });
});

describe('hasValidOpening', () => {
  it('returns true when alinea starts with mandatory opening prefix', () => {
    assert.equal(
      hasValidOpening('Werknemer is een 58-jarige vrouw met vijf jaar werkervaring als ondersteuner.'),
      true
    );
  });

  it('returns false when opening prefix is missing', () => {
    assert.equal(hasValidOpening('De werknemer heeft mbo-4 afgerond.'), false);
  });
});

describe('calculateAge', () => {
  it('computes age from ISO date of birth', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 40);
    const iso = dob.toISOString().slice(0, 10);
    assert.equal(calculateAge(iso), 40);
  });

  it('returns null for invalid date', () => {
    assert.equal(calculateAge('invalid'), null);
  });
});

describe('stripCitations', () => {
  it('removes pdf citation markers', () => {
    assert.equal(stripCitations('Tekst [1:2/intake.pdf] verder'), 'Tekst verder');
  });
});

describe('parsePersoonlijkProfielContentResult', () => {
  it('coerces empty strings to null', async () => {
    const { parsePersoonlijkProfielContentResult } = await import('../schema');
    const result = parsePersoonlijkProfielContentResult({
      alinea_1: '  ',
      alinea_2: 'Tekst',
      alinea_3: '',
    });
    assert.equal(result.alinea_1, null);
    assert.equal(result.alinea_2, 'Tekst');
    assert.equal(result.alinea_3, null);
  });
});
