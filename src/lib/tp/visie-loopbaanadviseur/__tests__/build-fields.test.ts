import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFunctiesIntro,
  buildVisieLoopbaanadviseurBlock,
  buildVisieLoopbaanadviseurFields,
  parseVisieLoopbaanadviseur,
} from '../build-fields';
import {
  AD_FUNCTIES_INTRO,
  FUNCTIE_FOOTER,
  FUNCTIES_DELIMITER,
  NO_AD_BELASTBAARHEID_INTRO,
  NO_AD_NO_BELASTBAARHEID_INTRO,
  TOELICHTING_DELIMITER,
  TOELICHTING_VROUW,
} from '../constants';
import {
  detectDocumentScenario,
  filterVisieLoopbaanadviseurDocs,
  getVisieLoopbaanadviseurDocCategory,
} from '../generate';
import type { VisieLoopbaanadviseurContentResult } from '../schema';

const baseCtx = {
  details: { gender: 'Vrouw' },
  meta: {
    fml_izp_lab_date: '2026-01-19',
    intake_date: '2026-06-05',
    occupational_doctor_org: 'Verzekeringsarts A.J. Karim',
    zoekprofiel: 'Zoekprofiel tekst',
    persoonlijk_profiel: 'Persoonlijk profiel tekst',
  },
};

const sampleFuncties: VisieLoopbaanadviseurContentResult = {
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
      toelichting: 'Past bij haar ervaring binnen de zorg.',
    },
    { naam: 'En soortgelijk', toelichting: '' },
  ],
};

describe('detectDocumentScenario', () => {
  it('returns ad when AD document is present', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(detectDocumentScenario(docs), 'ad');
  });

  it('returns belastbaarheid_only when FML/IZP without AD', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
    ];
    assert.equal(detectDocumentScenario(docs), 'belastbaarheid_only');
  });

  it('returns intake_only when only intake is present', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(detectDocumentScenario(docs), 'intake_only');
  });

  it('downgrades to belastbaarheid_only when concept intake despite AD doc', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(detectDocumentScenario(docs, { has_ad_report: false }), 'belastbaarheid_only');
    assert.equal(detectDocumentScenario(docs, { intake_concept: true }), 'belastbaarheid_only');
  });

  it('excludes AD docs from filter when excludeAd is set', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'ad_rapportage', url: 'b' },
    ];
    const filtered = filterVisieLoopbaanadviseurDocs(docs, { excludeAd: true });
    assert.equal(filtered.length, 1);
    assert.equal(getVisieLoopbaanadviseurDocCategory(filtered[0].type), 'intake');
  });
});

describe('buildFunctiesIntro', () => {
  it('maps three V10 scenarios to exact intro texts', () => {
    assert.equal(buildFunctiesIntro('ad'), AD_FUNCTIES_INTRO);
    assert.equal(buildFunctiesIntro('belastbaarheid_only'), NO_AD_BELASTBAARHEID_INTRO);
    assert.equal(buildFunctiesIntro('intake_only'), NO_AD_NO_BELASTBAARHEID_INTRO);
  });
});

describe('buildVisieLoopbaanadviseurFields V10', () => {
  it('uses AD intro for ad scenario', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'ad'
    );
    assert.ok(visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
    assert.match(visie_loopbaanadviseur, /• Medewerker uitkeringsadministratie –/);
    assert.match(visie_loopbaanadviseur, /• En soortgelijk/);
    assert.ok(visie_loopbaanadviseur.includes(FUNCTIE_FOOTER));
  });

  it('uses belastbaarheid intro for scenario 2', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'belastbaarheid_only'
    );
    assert.ok(visie_loopbaanadviseur.includes(NO_AD_BELASTBAARHEID_INTRO));
    assert.ok(!visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
  });

  it('uses intake-only intro for scenario 3', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'intake_only'
    );
    assert.ok(visie_loopbaanadviseur.includes(NO_AD_NO_BELASTBAARHEID_INTRO));
  });

  it('uses female toelichting template with haar', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'ad'
    );
    assert.ok(visie_loopbaanadviseur.includes(TOELICHTING_DELIMITER));
    assert.match(visie_loopbaanadviseur, /haar kansen op de arbeidsmarkt/);
    assert.ok(visie_loopbaanadviseur.includes(TOELICHTING_VROUW));
  });

  it('forces fourth function to En soortgelijk without toelichting', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        { naam: 'Functie A', toelichting: 'Passend.' },
        { naam: 'Functie B', toelichting: 'Passend.' },
        { naam: 'Functie C', toelichting: 'Passend.' },
        { naam: 'Verkeerde vierde', toelichting: 'Niet toegestaan.' },
      ],
    };
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(baseCtx, content, 'ad');
    assert.match(visie_loopbaanadviseur, /• En soortgelijk\n/);
    assert.ok(!visie_loopbaanadviseur.includes('Verkeerde vierde'));
  });
});

describe('filterVisieLoopbaanadviseurDocs', () => {
  it('filters and prioritizes belastbaarheid, ad, intake', () => {
    assert.equal(getVisieLoopbaanadviseurDocCategory('fml_izp'), 'belastbaarheid');
    assert.equal(getVisieLoopbaanadviseurDocCategory('ad_rapportage'), 'ad');
    assert.equal(getVisieLoopbaanadviseurDocCategory('intakeformulier'), 'intake');

    const filtered = filterVisieLoopbaanadviseurDocs([
      { type: 'intakeformulier', url: 'a' },
      { type: 'ad_rapportage', url: 'b' },
      { type: 'fml_izp', url: 'c' },
      { type: 'extra', url: 'd' },
    ]);
    assert.deepEqual(
      filtered.map((d) => d.type),
      ['fml_izp', 'ad_rapportage', 'intakeformulier']
    );
  });
});

describe('parseVisieLoopbaanadviseur / buildVisieLoopbaanadviseurBlock', () => {
  it('round-trips buildVisieLoopbaanadviseurFields output', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'ad'
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

describe('parseVisieLoopbaanadviseurContentResult', () => {
  it('parses functies-only schema', async () => {
    const { parseVisieLoopbaanadviseurContentResult } = await import('../schema');
    const result = parseVisieLoopbaanadviseurContentResult({
      functies: [
        { naam: 'A', toelichting: 'x' },
        { naam: 'B', toelichting: 'y' },
        { naam: 'C', toelichting: 'z' },
        { naam: 'En soortgelijk', toelichting: '' },
      ],
    });
    assert.equal(result.functies.length, 4);
    assert.equal(result.functies[3].naam, 'En soortgelijk');
  });
});
