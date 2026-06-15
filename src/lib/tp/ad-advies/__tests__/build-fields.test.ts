import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdAdviesFields,
  buildAdAdviesIntro,
} from '../build-fields';
import { ADVIES_DELIMITER } from '../constants';
import type { AdAdviesContentResult } from '../schema';

const ctx = {
  meta: {
    ad_report_date: '2026-02-10',
    has_ad_report: true,
  },
};

describe('buildAdAdviesFields', () => {
  it('assembles intro with delimiter and quote only', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: 'Marc Arendsen',
      ad_datum_iso: '2026-02-10',
      advies_citaat:
        'Voorbeelden van passend werk zijn op dit moment: Administratieve werkzaamheden.',
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);

    assert.match(
      advies_ad_passende_arbeid,
      /In het arbeidsdeskundigrapport, opgesteld door Marc Arendsen, op 10 februari 2026 staat het volgende advies over passende arbeid:/
    );
    assert.ok(advies_ad_passende_arbeid.includes(ADVIES_DELIMITER));
    assert.match(advies_ad_passende_arbeid, /Administratieve werkzaamheden/);
    assert.doesNotMatch(advies_ad_passende_arbeid, /Passend werk sluit aan/);
    assert.doesNotMatch(advies_ad_passende_arbeid, /•/);
  });

  it('uses meta date when model returns no date', () => {
    const content: AdAdviesContentResult = {
      ad_auteur: 'Bea Delhaes',
      ad_datum_iso: null,
      advies_citaat: 'Advies over 2e spoor.',
    };

    const { advies_ad_passende_arbeid } = buildAdAdviesFields(ctx, content);
    assert.match(advies_ad_passende_arbeid, /op 10 februari 2026/);
  });

  it('buildAdAdviesIntro matches expected format', () => {
    const intro = buildAdAdviesIntro('Marc Arendsen', '10 februari 2026');
    assert.equal(
      intro,
      'In het arbeidsdeskundigrapport, opgesteld door Marc Arendsen, op 10 februari 2026 staat het volgende advies over passende arbeid:'
    );
  });
});
