import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildParagraph,
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
  woonsituatie: null,
  gezinssituatie: null,
  familiecontacten: null,
  sociaal_netwerk: null,
  sociale_contacten: null,
  sociale_steun: null,
  praktische_omstandigheden: null,
  huishoudelijke_taken: null,
  zorgtaken: null,
  dagelijkse_bezigheden: null,
  dagstructuur: null,
  activiteiten_buitenshuis: null,
  vrije_tijd: null,
  hobby: null,
  sport: null,
  vrijwilligerswerk: null,
  maatschappelijke_activiteiten: null,
});

describe('buildSocialeAchtergrondFields', () => {
  it('builds three paragraphs in fixed order when all alineas have content', () => {
    const content: SocialeAchtergrondContentResult = {
      ...emptyContent(),
      woonsituatie: 'Werknemer woont samen met haar partner',
      huishoudelijke_taken: 'Werknemer verzorgt het huishouden',
      hobby: 'Werknemer wandelt regelmatig',
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    const parts = sociale_achtergrond.split('\n\n');
    assert.equal(parts.length, 3);
    assert.match(parts[0], /woont samen met haar partner/);
    assert.match(parts[1], /huishouden/);
    assert.match(parts[2], /wandelt/);
  });

  it('omits empty alineas', () => {
    const content: SocialeAchtergrondContentResult = {
      ...emptyContent(),
      woonsituatie: 'Werknemer woont alleen',
      hobby: 'Werknemer leest graag',
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    const parts = sociale_achtergrond.split('\n\n');
    assert.equal(parts.length, 2);
    assert.match(parts[0], /woont alleen/);
    assert.match(parts[1], /leest graag/);
  });

  it('returns empty string when all topics are null', () => {
    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, emptyContent());
    assert.equal(sociale_achtergrond, '');
  });

  it('joins multiple topics within one alinea in schema order', () => {
    const content: SocialeAchtergrondContentResult = {
      ...emptyContent(),
      woonsituatie: 'Werknemer woont in een appartement',
      gezinssituatie: 'Werknemer heeft twee kinderen',
      familiecontacten: 'Het contact met haar moeder is regelmatig',
    };

    const { sociale_achtergrond } = buildSocialeAchtergrondFields(baseCtx, content);
    assert.equal(sociale_achtergrond.split('\n\n').length, 1);
    assert.match(sociale_achtergrond, /appartement.*twee kinderen.*haar moeder/s);
  });
});

describe('buildParagraph', () => {
  it('adds sentence-ending punctuation when missing', () => {
    const result = buildParagraph(['Werknemer woont alleen', 'Werknemer heeft een partner']);
    assert.ok(result?.endsWith('.'));
    assert.match(result!, /Werknemer woont alleen\. Werknemer heeft een partner\./);
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
