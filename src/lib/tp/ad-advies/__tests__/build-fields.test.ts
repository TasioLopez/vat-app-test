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

const CALVIN_ADVIES =
  'Er is nu geen perspectief op volledige hervatting in werk bij de voormalige eigen werkgever waardoor een 2e spoor traject dient te worden opgestart. Uitgangspunt hierbij is dat werknemer arbeidsmogelijkheden heeft, maar hij is nog niet direct (volledig) inzetbaar. Nadruk op: activering en opbouw inzetbaarheid (bijv. WEP of activeringstraject), met als doel (partiële) werkhervatting in eigen of ander (beter) passend werk.';

const ctx = {
  meta: {
    ad_report_date: '2026-02-02',
    has_ad_report: true,
    occupational_doctor_name: 'Bea Delhaes',
  },
};

describe('buildAdAdviesFields', () => {
  it('assembles Calvin intake Sectie 7 advies quote only', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: 'Bea Delhaes',
      ad_datum_iso: '2026-02-02',
      advies_citaat: CALVIN_ADVIES,
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);

    assert.match(
      advies_ad_passende_arbeid,
      /In het arbeidsdeskundigrapport, opgesteld door Bea Delhaes, op 2 februari 2026 staat het volgende advies over passende arbeid:/
    );
    assert.ok(advies_ad_passende_arbeid.includes(ADVIES_DELIMITER));
    assert.match(advies_ad_passende_arbeid, /geen perspectief op volledige hervatting/);
    assert.doesNotMatch(advies_ad_passende_arbeid, /Computergericht/);
    assert.doesNotMatch(advies_ad_passende_arbeid, /Facilitair/);
  });

  it('uses meta occupational_doctor_name when model returns no auteur', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: null,
      ad_datum_iso: null,
      advies_citaat: CALVIN_ADVIES,
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);
    assert.match(advies_ad_passende_arbeid, /opgesteld door Bea Delhaes/);
    assert.match(advies_ad_passende_arbeid, /op 2 februari 2026/);
  });

  it('buildAdAdviesIntro matches expected format', () => {
    const intro = buildAdAdviesIntro('Bea Delhaes', '2 februari 2026');
    assert.equal(
      intro,
      'In het arbeidsdeskundigrapport, opgesteld door Bea Delhaes, op 2 februari 2026 staat het volgende advies over passende arbeid:'
    );
  });

  it('parseAdAdvies and buildAdAdviesBlock round-trip', () => {
    const intro =
      'In het arbeidsdeskundigrapport, opgesteld door Bea Delhaes, op 2 februari 2026 staat het volgende advies over passende arbeid:';
    const citaat = CALVIN_ADVIES;
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
});
