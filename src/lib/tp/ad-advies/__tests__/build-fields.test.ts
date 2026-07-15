import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdAdviesFields,
  buildAdAdviesIntro,
  buildAdAdviesBlock,
  parseAdAdvies,
} from '../build-fields';
import { ADVIES_DELIMITER } from '../constants';
import type { AdAdviesContentResult } from '../schema';

const CALVIN_SPOOR2_ADVIES =
  'Er is nu geen perspectief op volledige hervatting in werk bij de voormalige eigen werkgever waardoor een 2e spoor traject dient te worden opgestart.';

const KELLY_PASSENDE_FUNCTIES = `Ik denk aan eventuele functies zoals:
- lichte, zittende werkzaamheden zoals assemblage medewerker of visuele controle en inspectiewerk in een hygiënische productieomgeving;
- werkomgeving (of vanuit huis), waarbij vooral gekeken wordt, tellen, controleren of sorteren op zicht, in eigen tempo; lichte/kleine producten die met minimale handkracht verplaatst kunnen worden; geen of weinig repeterende handbewegingen.
- Lichte voorbereidende werkzaamheden (etiketten sorteren, eenvoudige materialen klaarleggen) aan een tafel. Er moet meer dan voldoende zelfregie zijn om zitten, staan en lopen goed af te wisselen.`;

const ctx = {
  meta: {
    ad_report_date: '2026-02-02',
    has_ad_report: true,
    occupational_doctor_name: 'Patricia Boomsma',
  },
};

describe('buildAdAdviesFields', () => {
  it('assembles intake Sectie 7 Quote passende functies verbatim', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: 'Patricia Boomsma',
      ad_datum_iso: '2026-02-02',
      advies_citaat: KELLY_PASSENDE_FUNCTIES,
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);

    assert.match(
      advies_ad_passende_arbeid,
      /opgesteld door P\. Boomsma, op 2 februari 2026 staat het volgende advies over passende arbeid:/
    );
    assert.ok(advies_ad_passende_arbeid.includes(ADVIES_DELIMITER));
    assert.match(advies_ad_passende_arbeid, /Ik denk aan eventuele functies zoals/);
    assert.match(advies_ad_passende_arbeid, /assemblage medewerker/);
    assert.match(advies_ad_passende_arbeid, /etiketten sorteren/);
    assert.doesNotMatch(advies_ad_passende_arbeid, /geen perspectief op volledige hervatting/);
  });

  it('uses meta occupational_doctor_name when model returns no auteur', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: null,
      ad_datum_iso: null,
      advies_citaat: KELLY_PASSENDE_FUNCTIES,
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);
    assert.match(advies_ad_passende_arbeid, /opgesteld door P\. Boomsma/);
    assert.match(advies_ad_passende_arbeid, /op 2 februari 2026/);
  });

  it('buildAdAdviesIntro matches expected format', () => {
    const intro = buildAdAdviesIntro('Patricia Boomsma', '2 februari 2026');
    assert.equal(
      intro,
      'In het arbeidsdeskundigrapport, opgesteld door Patricia Boomsma, op 2 februari 2026 staat het volgende advies over passende arbeid:'
    );

    const conceptIntro = buildAdAdviesIntro('Patricia Boomsma', '2 februari 2026', true);
    assert.equal(
      conceptIntro,
      'In het concept arbeidsdeskundigrapport, opgesteld door Patricia Boomsma, op 2 februari 2026 staat het volgende advies over passende arbeid:'
    );
  });

  it('uses concept intro when ad_report_concept is true', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: 'Patricia Boomsma',
      ad_datum_iso: '2026-05-21',
      advies_citaat: KELLY_PASSENDE_FUNCTIES,
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(
      { meta: { ...ctx.meta, ad_report_concept: true } },
      content
    );

    assert.match(advies_ad_passende_arbeid, /In het concept arbeidsdeskundigrapport,/);
  });

  it('parseAdAdvies and buildAdAdviesBlock round-trip', () => {
    const intro =
      'In het arbeidsdeskundigrapport, opgesteld door Patricia Boomsma, op 2 februari 2026 staat het volgende advies over passende arbeid:';
    const citaat = KELLY_PASSENDE_FUNCTIES;
    const block = buildAdAdviesBlock(intro, citaat);

    assert.ok(block.includes(ADVIES_DELIMITER));
    const parsed = parseAdAdvies(block);
    assert.equal(parsed.intro, intro);
    assert.equal(parsed.citaat, citaat);
  });

  it('parseAdAdvies legacy text without delimiter', () => {
    const legacy = 'Oude vrije tekst zonder delimiter.';
    const parsed = parseAdAdvies(legacy);
    assert.equal(parsed.intro, legacy);
    assert.equal(parsed.citaat, '');
  });

  it('does not include spoor 2 advies when quoting passende functies', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: 'Patricia Boomsma',
      ad_datum_iso: '2026-02-02',
      advies_citaat: KELLY_PASSENDE_FUNCTIES,
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);
    assert.doesNotMatch(advies_ad_passende_arbeid, new RegExp(CALVIN_SPOOR2_ADVIES));
  });
});
