import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVisieWerknemerFields,
  stripCitations,
  type VisieWerknemerBuildContext,
} from '../build-fields';
import { SPOOR2_NEUTRAL_CLOSING } from '../constants';
import type { VisieWerknemerContentResult } from '../schema';

const baseCtx: VisieWerknemerBuildContext = {
  employee: { first_name: 'Kim', last_name: 'Baaijens' },
  details: { gender: 'Vrouw' },
};

describe('buildVisieWerknemerFields', () => {
  it('joins two alinea paragraphs with double newlines', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: 'Werknemer geeft aan haar werk met plezier uit te voeren.',
      alinea_2: 'Ten aanzien van spoor 2 geeft werknemer aan mee te werken.',
      heeft_concrete_spoor2_voorkeuren: false,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    const parts = visie_werknemer.split('\n\n');
    assert.equal(parts.length, 2);
    assert.match(parts[0], /plezier/);
    assert.match(parts[1], /spoor 2/);
  });

  it('returns single paragraph when alinea_2 is null', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: 'Werknemer zet zich in voor terugkeer in eigen werk.',
      alinea_2: null,
      heeft_concrete_spoor2_voorkeuren: false,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    assert.equal(visie_werknemer.split('\n\n').length, 1);
  });

  it('appends neutral spoor 2 closing when no concrete preferences', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: null,
      alinea_2: 'Ten aanzien van spoor 2 geeft werknemer aan mee te werken aan het traject.',
      heeft_concrete_spoor2_voorkeuren: false,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    assert.match(visie_werknemer, /passende arbeidsrichtingen nader worden onderzocht/);
    assert.ok(visie_werknemer.includes(SPOOR2_NEUTRAL_CLOSING));
  });

  it('does not duplicate neutral closing when model already included it', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: null,
      alinea_2: `Werknemer werkt mee aan spoor 2. ${SPOOR2_NEUTRAL_CLOSING}`,
      heeft_concrete_spoor2_voorkeuren: false,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    const matches = visie_werknemer.match(/passende arbeidsrichtingen nader worden onderzocht/gi);
    assert.equal(matches?.length, 1);
  });

  it('skips neutral closing append when concrete preferences are named', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: null,
      alinea_2: 'Werknemer noemt interesse in administratief werk binnen de zorg.',
      heeft_concrete_spoor2_voorkeuren: true,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    assert.ok(!visie_werknemer.includes(SPOOR2_NEUTRAL_CLOSING));
  });

  it('strips accidental section heading from alinea text', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: 'Visie van werknemer Werknemer geeft aan positief over het werk te denken.',
      alinea_2: null,
      heeft_concrete_spoor2_voorkeuren: false,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    assert.ok(!visie_werknemer.startsWith('Visie van werknemer'));
    assert.match(visie_werknemer, /positief over het werk/);
  });

  it('returns empty string when both alineas are null', () => {
    const content: VisieWerknemerContentResult = {
      alinea_1: null,
      alinea_2: null,
      heeft_concrete_spoor2_voorkeuren: false,
    };

    const { visie_werknemer } = buildVisieWerknemerFields(baseCtx, content);
    assert.equal(visie_werknemer, '');
  });
});

describe('stripCitations', () => {
  it('removes pdf citation markers', () => {
    assert.equal(stripCitations('Tekst [1:2/intake.pdf] verder'), 'Tekst verder');
  });
});

describe('parseVisieWerknemerContentResult', () => {
  it('coerces empty strings to null and parses boolean', async () => {
    const { parseVisieWerknemerContentResult } = await import('../schema');
    const result = parseVisieWerknemerContentResult({
      alinea_1: '  ',
      alinea_2: 'Tekst',
      heeft_concrete_spoor2_voorkeuren: true,
    });
    assert.equal(result.alinea_1, null);
    assert.equal(result.alinea_2, 'Tekst');
    assert.equal(result.heeft_concrete_spoor2_voorkeuren, true);
  });
});
