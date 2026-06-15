import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildVisieLoopbaanadviseurFields } from '../build-fields';
import {
  AD_FUNCTIES_INTRO,
  FUNCTIE_FOOTER,
  FUNCTIES_DELIMITER,
  TOELICHTING_DELIMITER,
  TOELICHTING_VROUW,
} from '../constants';
import type { VisieLoopbaanadviseurContentResult } from '../schema';

const baseCtx = {
  details: { gender: 'Vrouw' },
  meta: {
    fml_izp_lab_date: '2026-01-19',
    intake_date: '2026-06-05',
    occupational_doctor_org: 'Verzekeringsarts A.J. Karim',
  },
};

const sampleFuncties: VisieLoopbaanadviseurContentResult = {
  ad_functies_bekend: true,
  functies: [
    {
      naam: 'Medewerker uitkeringsadministratie',
      toelichting:
        'Sluit aan bij haar zorgvuldige werkwijze en administratieve vaardigheden.',
    },
    {
      naam: 'Medewerker planning (ondersteunend)',
      toelichting: 'Past bij haar organisatorische vaardigheden.',
    },
    {
      naam: 'Cliëntadministrateur',
      toelichting: 'Past bij haar ervaring binnen de zcare.',
    },
    { naam: 'En soortgelijk', toelichting: '' },
  ],
};

describe('buildVisieLoopbaanadviseurFields', () => {
  it('uses female toelichting template with haar', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties
    );
    assert.ok(visie_loopbaanadviseur.includes(TOELICHTING_DELIMITER));
    assert.match(visie_loopbaanadviseur, /haar kansen op de arbeidsmarkt/);
    assert.ok(visie_loopbaanadviseur.includes(TOELICHTING_VROUW));
  });

  it('uses AD functies intro when ad_functies_bekend is true', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties
    );
    assert.ok(visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
  });

  it('uses FML functies intro when no AD functions known', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(baseCtx, {
      ...sampleFuncties,
      ad_functies_bekend: false,
    });
    assert.match(visie_loopbaanadviseur, /Functionele Mogelijkhedenlijst/);
    assert.match(visie_loopbaanadviseur, /19 januari 2026/);
    assert.match(visie_loopbaanadviseur, /5 juni 2026/);
  });

  it('formats four function bullets and footer', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties
    );
    assert.ok(visie_loopbaanadviseur.includes(FUNCTIES_DELIMITER));
    assert.match(visie_loopbaanadviseur, /• Medewerker uitkeringsadministratie –/);
    assert.match(visie_loopbaanadviseur, /• En soortgelijk/);
    assert.ok(visie_loopbaanadviseur.includes(FUNCTIE_FOOTER));
  });
});
