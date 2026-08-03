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
  AD_NO_FUNCTIES_INTRO,
  CONCEPT_AD_FUNCTIES_INTRO,
  CONCEPT_AD_NO_FUNCTIES_INTRO,
  FUNCTIE_FOOTER,
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
import { parseFunctieLine } from '../parse-functie-line';
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
  ],
};

const AD_ADVIES_WITH_FUNCTIES = `In het arbeidsdeskundigrapport, opgesteld door P. Boomsma, op 2 februari 2026 staat het volgende advies over passende arbeid:

<<<ADVIES>>>
Ik denk aan eventuele functies zoals:
- lichte, zittende werkzaamheden zoals assemblage medewerker
- medewerker planning`;

const ADVIES_NB =
  'N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.';

describe('detectDocumentScenario', () => {
  it('returns ad_with_functies when AD document and named functions in advies', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(
      detectDocumentScenario(docs, { advies_ad_passende_arbeid: AD_ADVIES_WITH_FUNCTIES }),
      'ad_with_functies'
    );
  });

  it('returns ad_no_functies when AD document but no named functions', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(detectDocumentScenario(docs, { advies_ad_passende_arbeid: ADVIES_NB }), 'ad_no_functies');
    assert.equal(detectDocumentScenario(docs, { advies_ad_passende_arbeid: '' }), 'ad_no_functies');
  });

  it('returns concept_ad_no_functies for concept AD without AD PDF when no functions named', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
    ];
    assert.equal(
      detectDocumentScenario(docs, {
        ad_report_concept: true,
        has_ad_report: false,
        advies_ad_passende_arbeid: '',
      }),
      'concept_ad_no_functies'
    );
  });

  it('returns concept_ad_with_functies for concept AD when advies has functions', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(
      detectDocumentScenario(docs, {
        ad_report_concept: true,
        has_ad_report: false,
        advies_ad_passende_arbeid: AD_ADVIES_WITH_FUNCTIES,
      }),
      'concept_ad_with_functies'
    );
  });

  it('returns concept_ad_with_functies even when AD PDF is present if concept flag set', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(
      detectDocumentScenario(docs, {
        ad_report_concept: true,
        has_ad_report: false,
        advies_ad_passende_arbeid: AD_ADVIES_WITH_FUNCTIES,
      }),
      'concept_ad_with_functies'
    );
  });

  it('returns belastbaarheid_only when FML/IZP without AD narrative', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
    ];
    assert.equal(detectDocumentScenario(docs, { has_ad_report: false }), 'belastbaarheid_only');
  });

  it('returns intake_only when only intake is present', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(detectDocumentScenario(docs), 'intake_only');
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
  it('maps six AD-regels scenarios to exact intro texts', () => {
    assert.equal(buildFunctiesIntro('ad_with_functies'), AD_FUNCTIES_INTRO);
    assert.ok(AD_FUNCTIES_INTRO.endsWith('functies*:'));
    assert.equal(buildFunctiesIntro('ad_no_functies'), AD_NO_FUNCTIES_INTRO);
    assert.match(AD_NO_FUNCTIES_INTRO, /geen passende functies benoemd/);
    assert.equal(buildFunctiesIntro('concept_ad_with_functies'), CONCEPT_AD_FUNCTIES_INTRO);
    assert.ok(CONCEPT_AD_FUNCTIES_INTRO.endsWith('functies*:'));
    assert.match(CONCEPT_AD_FUNCTIES_INTRO, /concept arbeidsdeskundige/);
    assert.equal(buildFunctiesIntro('concept_ad_no_functies'), CONCEPT_AD_NO_FUNCTIES_INTRO);
    assert.match(CONCEPT_AD_NO_FUNCTIES_INTRO, /concept arbeidsdeskundig rapport/);
    assert.equal(buildFunctiesIntro('belastbaarheid_only'), NO_AD_BELASTBAARHEID_INTRO);
    assert.match(NO_AD_BELASTBAARHEID_INTRO, /Er is geen arbeidsdeskundig rapport beschikbaar/);
    assert.equal(buildFunctiesIntro('intake_only'), NO_AD_NO_BELASTBAARHEID_INTRO);
    assert.match(NO_AD_NO_BELASTBAARHEID_INTRO, /geen arbeidsdeskundig rapport en belastbaarheidsprofiel/);
  });
});

describe('buildVisieLoopbaanadviseurFields V10', () => {
  it('uses AD intro for ad_with_functies scenario with colon separators', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'ad_with_functies'
    );
    assert.ok(visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
    assert.match(visie_loopbaanadviseur, /• Medewerker uitkeringsadministratie:/);
    assert.ok(!visie_loopbaanadviseur.includes('En soortgelijk'));
    assert.ok(visie_loopbaanadviseur.includes(FUNCTIE_FOOTER));
  });

  it('uses AD-no-functies intro when scenario is ad_no_functies', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'ad_no_functies'
    );
    assert.ok(visie_loopbaanadviseur.includes(AD_NO_FUNCTIES_INTRO));
    assert.ok(!visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
  });

  it('uses concept AD intro when scenario is concept_ad_with_functies', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'concept_ad_with_functies'
    );
    assert.ok(visie_loopbaanadviseur.includes(CONCEPT_AD_FUNCTIES_INTRO));
    assert.ok(!visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
  });

  it('uses concept AD-no-functies intro when scenario is concept_ad_no_functies', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'concept_ad_no_functies'
    );
    assert.ok(visie_loopbaanadviseur.includes(CONCEPT_AD_NO_FUNCTIES_INTRO));
    assert.ok(!visie_loopbaanadviseur.includes(AD_NO_FUNCTIES_INTRO));
  });

  it('uses belastbaarheid intro for scenario belastbaarheid_only', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'belastbaarheid_only'
    );
    assert.ok(visie_loopbaanadviseur.includes(NO_AD_BELASTBAARHEID_INTRO));
    assert.ok(!visie_loopbaanadviseur.includes(AD_FUNCTIES_INTRO));
  });

  it('uses intake-only intro for scenario intake_only', () => {
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
      'ad_with_functies'
    );
    assert.ok(visie_loopbaanadviseur.includes(TOELICHTING_DELIMITER));
    assert.match(visie_loopbaanadviseur, /haar kansen op de arbeidsmarkt/);
    assert.ok(visie_loopbaanadviseur.includes(TOELICHTING_VROUW));
  });

  it('omits En soortgelijk and keeps only three concrete functies', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        { naam: 'Functie A', toelichting: 'Passend.' },
        { naam: 'Functie B', toelichting: 'Passend.' },
        { naam: 'Functie C', toelichting: 'Passend.' },
        { naam: 'En soortgelijk', toelichting: '' },
        { naam: 'Functie D', toelichting: 'Te veel.' },
      ],
    };
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      content,
      'ad_with_functies'
    );
    assert.ok(!visie_loopbaanadviseur.includes('En soortgelijk'));
    assert.ok(!visie_loopbaanadviseur.includes('Functie D'));
    assert.match(visie_loopbaanadviseur, /• Functie A: Passend\./);
    assert.match(visie_loopbaanadviseur, /• Functie B: Passend\./);
    assert.match(visie_loopbaanadviseur, /• Functie C: Passend\./);
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
      'ad_with_functies'
    );
    const parsed = parseVisieLoopbaanadviseur(visie_loopbaanadviseur);
    const rebuilt = buildVisieLoopbaanadviseurBlock(parsed);

    assert.equal(rebuilt, visie_loopbaanadviseur);
    assert.ok(parsed.toelichting.includes(TOELICHTING_VROUW));
    assert.equal(parsed.functiesIntro, AD_FUNCTIES_INTRO);
    assert.match(parsed.functieBullets, /• Medewerker uitkeringsadministratie:/);
    assert.equal(parsed.footer, FUNCTIE_FOOTER);
  });

  it('round-trips ad_no_functies multi-sentence intro', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'ad_no_functies'
    );
    const parsed = parseVisieLoopbaanadviseur(visie_loopbaanadviseur);
    assert.equal(parsed.functiesIntro, AD_NO_FUNCTIES_INTRO);
  });

  it('round-trips concept_ad_no_functies multi-sentence intro', () => {
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      sampleFuncties,
      'concept_ad_no_functies'
    );
    const parsed = parseVisieLoopbaanadviseur(visie_loopbaanadviseur);
    assert.equal(parsed.functiesIntro, CONCEPT_AD_NO_FUNCTIES_INTRO);
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

  it('preserves trailing and internal spaces in visie round-trip', () => {
    const draft = {
      toelichting: 'toelichting ',
      functiesIntro: 'intro  tekst ',
      functieBullets: '• Functie: toelichting ',
      footer: FUNCTIE_FOOTER,
    };
    const block = buildVisieLoopbaanadviseurBlock(draft);
    const parsed = parseVisieLoopbaanadviseur(block);
    assert.equal(parsed.toelichting, draft.toelichting);
    assert.equal(parsed.functiesIntro, draft.functiesIntro);
    assert.equal(parsed.functieBullets, draft.functieBullets);
  });
});

describe('parseVisieLoopbaanadviseurContentResult', () => {
  it('parses three functies and drops En soortgelijk', async () => {
    const { parseVisieLoopbaanadviseurContentResult } = await import('../schema');
    const result = parseVisieLoopbaanadviseurContentResult({
      functies: [
        { naam: 'A', toelichting: 'x' },
        { naam: 'B', toelichting: 'y' },
        { naam: 'C', toelichting: 'z' },
        { naam: 'En soortgelijk', toelichting: '' },
      ],
    });
    assert.equal(result.functies.length, 3);
    assert.equal(result.functies[2].naam, 'C');
  });
});

describe('parseFunctieLine', () => {
  it('keeps hyphen inside title when splitting on colon', () => {
    const parsed = parseFunctieLine(
      '• Supply chain - data medewerker: Benut haar ERP-ervaring.'
    );
    assert.deepEqual(parsed, {
      title: 'Supply chain - data medewerker',
      description: 'Benut haar ERP-ervaring.',
    });
  });

  it('parses legacy spaced en-dash without splitting ASCII hyphens in the title', () => {
    const parsed = parseFunctieLine(
      '• Supply chain - data medewerker – Benut haar ERP-ervaring.'
    );
    assert.deepEqual(parsed, {
      title: 'Supply chain - data medewerker',
      description: 'Benut haar ERP-ervaring.',
    });
  });

  it('parses bold-wrapped title with colon', () => {
    const parsed = parseFunctieLine('• **Planner logistiek**: Past bij ervaring.');
    assert.deepEqual(parsed, {
      title: 'Planner logistiek',
      description: 'Past bij ervaring.',
    });
  });
});
