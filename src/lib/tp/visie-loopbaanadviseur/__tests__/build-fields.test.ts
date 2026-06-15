import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVisieLoopbaanadviseurBlock,
  buildVisieLoopbaanadviseurContentFromIntake,
  buildVisieLoopbaanadviseurFields,
  parseVisieLoopbaanadviseur,
} from '../build-fields';
import {
  AD_FUNCTIES_INTRO,
  FUNCTIE_FOOTER,
  FUNCTIES_DELIMITER,
  TOELICHTING_DELIMITER,
  TOELICHTING_VROUW,
} from '../constants';
import type { VisieLoopbaanadviseurContentResult } from '../schema';

const CALVIN_CATEGORIES = [
  {
    naam: 'Computergericht/Administratief',
    toelichting:
      'gegevensverwerking, documentcontrole, digitalisering en archivering, e-learning modules beheren.',
  },
  {
    naam: 'Facilitair',
    toelichting: 'materiaalbeheer, lichte logistiek zonder tijdsdruk, gebouwencontrole.',
  },
  {
    naam: 'En vergelijkbaar',
    toelichting:
      'middels arbeidsmarktonderzoek moet gezocht worden naar meer passende taken/functies en de omstandigheden waarbinnen passend werk kan worden uitgevoerd.',
  },
];

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
  it('uses verbatim Calvin intake categories with AD intro', () => {
    const content = buildVisieLoopbaanadviseurContentFromIntake(CALVIN_CATEGORIES);
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(baseCtx, content);

    assert.ok(visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
    assert.match(visie_loopbaanadviseur, /• Computergericht\/Administratief – gegevensverwerking/);
    assert.match(visie_loopbaanadviseur, /• Facilitair – materiaalbeheer/);
    assert.match(visie_loopbaanadviseur, /• En vergelijkbaar – middels arbeidsmarktonderzoek/);
    assert.match(visie_loopbaanadviseur, /• En soortgelijk/);
    assert.doesNotMatch(visie_loopbaanadviseur, /Medewerker uitkeringsadministratie/);
  });

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

describe('parseVisieLoopbaanadviseur / buildVisieLoopbaanadviseurBlock', () => {
  it('round-trips buildVisieLoopbaanadviseurFields output', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties
    );
    const parsed = parseVisieLoopbaanadviseur(visie_loopbaanadviseur);
    const rebuilt = buildVisieLoopbaanadviseurBlock(parsed);

    assert.equal(rebuilt, visie_loopbaanadviseur);
    assert.ok(parsed.toelichting.includes(TOELICHTING_VROUW));
    assert.equal(parsed.functiesIntro, AD_FUNCTIES_INTRO);
    assert.match(parsed.functieBullets, /• Medewerker uitkeringsadministratie –/);
    assert.equal(parsed.footer, FUNCTIE_FOOTER);
  });

  it('falls back to plain toelichting when delimiters are missing', () => {
    const legacy = 'Enkelvoudige tekst zonder delimiters.';
    const parsed = parseVisieLoopbaanadviseur(legacy);

    assert.equal(parsed.toelichting, legacy);
    assert.equal(parsed.functiesIntro, '');
    assert.equal(parsed.functieBullets, '');
    assert.equal(parsed.footer, FUNCTIE_FOOTER);

    const rebuilt = buildVisieLoopbaanadviseurBlock(parsed);
    assert.ok(rebuilt.includes(TOELICHTING_DELIMITER));
    assert.ok(rebuilt.includes(legacy));
  });
});
