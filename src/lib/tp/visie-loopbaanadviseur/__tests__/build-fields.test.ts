import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADVIES_DELIMITER, ADVIES_NB_NO_REPORT } from '@/lib/tp/ad-advies/constants';
import { BELASTBAARHEID_GEEN_PROFIEL } from '@/lib/tp/belastbaarheidsprofiel/constants';
import {
  buildFunctiesIntro,
  buildVisieLoopbaanadviseurBlock,
  buildVisieLoopbaanadviseurFields,
  lowercaseDutchAfterColon,
  parseVisieLoopbaanadviseur,
  repairStoredVisieFunctiesIntro,
} from '../build-fields';
import {
  AD_FUNCTIES_INTRO,
  AD_NO_FUNCTIES_INTRO,
  CONCEPT_AD_FUNCTIES_INTRO,
  CONCEPT_AD_NO_FUNCTIES_INTRO,
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
  hasMeaningfulPrognose,
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

const ADVIES_NB = ADVIES_NB_NO_REPORT;

describe('detectDocumentScenario', () => {
  it('returns ad_with_functies when has_ad_report and named functions in advies', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(
      detectDocumentScenario(docs, {
        has_ad_report: true,
        advies_ad_passende_arbeid: AD_ADVIES_WITH_FUNCTIES,
      }),
      'ad_with_functies'
    );
  });

  it('returns ad_with_functies from meaningful advies even without has_ad_report flag', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(
      detectDocumentScenario(docs, { advies_ad_passende_arbeid: AD_ADVIES_WITH_FUNCTIES }),
      'ad_with_functies'
    );
  });

  it('returns ad_no_functies when has_ad_report but no named functions', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
    ];
    assert.equal(
      detectDocumentScenario(docs, {
        has_ad_report: true,
        advies_ad_passende_arbeid: '',
      }),
      'ad_no_functies'
    );
  });

  it('does not treat AD PDF alone as definitive AD when advies is N.B.', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
      { type: 'ad_rapportage', url: 'c' },
    ];
    assert.equal(
      detectDocumentScenario(docs, {
        has_ad_report: false,
        advies_ad_passende_arbeid: ADVIES_NB,
      }),
      'belastbaarheid_only'
    );
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

  it('detects Habib-style Quote passende functies bullets as with_functies', () => {
    const advies = [
      'In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid:',
      '',
      '<<<ADVIES>>>',
      'Passend werk sluit aan bij de bekwaamheden.',
      '- Receptiemedewerker',
      '- Projectondersteuner',
      '- Data-entry medewerker',
    ].join('\n');
    assert.equal(
      detectDocumentScenario([{ type: 'intakeformulier', url: 'a' }], {
        has_ad_report: true,
        advies_ad_passende_arbeid: advies,
      }),
      'ad_with_functies'
    );
  });

  it('returns belastbaarheid_only when FML/IZP without AD narrative', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'fml_izp', url: 'b' },
    ];
    assert.equal(detectDocumentScenario(docs, { has_ad_report: false }), 'belastbaarheid_only');
  });

  it('returns belastbaarheid_only for intake + spreekuur without AD (Mulkiye)', () => {
    const docs = [
      { type: 'intakeformulier', url: 'a' },
      { type: 'spreek_reportage', url: 'b' },
    ];
    assert.equal(detectDocumentScenario(docs, { has_ad_report: false }), 'belastbaarheid_only');
  });

  it('returns belastbaarheid_only when meaningful prognose exists without FML/spreekuur', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(
      detectDocumentScenario(docs, {
        has_ad_report: false,
        prognose_bedrijfsarts:
          'Conform de FML van 18 november 2026 gelden beperkingen in dynamische handelingen.',
      }),
      'belastbaarheid_only'
    );
  });

  it('keeps intake_only when prognose is the unavailable placeholder', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(
      detectDocumentScenario(docs, {
        has_ad_report: false,
        prognose_bedrijfsarts: BELASTBAARHEID_GEEN_PROFIEL,
      }),
      'intake_only'
    );
  });

  it('keeps intake_only when only zoekprofiel is filled', () => {
    const docs = [{ type: 'intakeformulier', url: 'a' }];
    assert.equal(
      detectDocumentScenario(docs, {
        has_ad_report: false,
        zoekprofiel: 'Zoekprofiel tekst zonder belastbaarheidsprofiel.',
      }),
      'intake_only'
    );
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

describe('hasMeaningfulPrognose', () => {
  it('rejects empty and unavailable placeholder', () => {
    assert.equal(hasMeaningfulPrognose(''), false);
    assert.equal(hasMeaningfulPrognose(null), false);
    assert.equal(hasMeaningfulPrognose(BELASTBAARHEID_GEEN_PROFIEL), false);
  });

  it('accepts real prognose text', () => {
    assert.equal(hasMeaningfulPrognose('Beperkingen in werktijden.'), true);
  });
});

describe('buildFunctiesIntro', () => {
  it('maps six AD-regels scenarios to exact intro texts', () => {
    assert.equal(buildFunctiesIntro('ad_with_functies'), AD_FUNCTIES_INTRO);
    assert.ok(AD_FUNCTIES_INTRO.endsWith('functies:'));
    assert.equal(buildFunctiesIntro('ad_no_functies'), AD_NO_FUNCTIES_INTRO);
    assert.match(AD_NO_FUNCTIES_INTRO, /geen passende functies benoemd/);
    assert.equal(buildFunctiesIntro('concept_ad_with_functies'), CONCEPT_AD_FUNCTIES_INTRO);
    assert.ok(CONCEPT_AD_FUNCTIES_INTRO.endsWith('functies:'));
    assert.match(CONCEPT_AD_FUNCTIES_INTRO, /in het concept arbeidsdeskundigrapport/);
    assert.equal(buildFunctiesIntro('concept_ad_no_functies'), CONCEPT_AD_NO_FUNCTIES_INTRO);
    assert.match(CONCEPT_AD_NO_FUNCTIES_INTRO, /concept arbeidsdeskundig rapport/);
    assert.equal(buildFunctiesIntro('belastbaarheid_only'), NO_AD_BELASTBAARHEID_INTRO);
    assert.match(NO_AD_BELASTBAARHEID_INTRO, /Er is geen arbeidsdeskundig rapport beschikbaar/);
    assert.equal(buildFunctiesIntro('intake_only'), NO_AD_NO_BELASTBAARHEID_INTRO);
    assert.match(NO_AD_NO_BELASTBAARHEID_INTRO, /geen functies geduid door de loopbaanadviseur/);
  });
});

describe('repairStoredVisieFunctiesIntro', () => {
  it('swaps exact SoT AD_NO_FUNCTIES_INTRO to AD_FUNCTIES_INTRO when scenario has functions', () => {
    const stored = [
      TOELICHTING_DELIMITER,
      TOELICHTING_VROUW,
      FUNCTIES_DELIMITER,
      AD_NO_FUNCTIES_INTRO,
      '• Planner logistiek: toelichting.',
      FUNCTIE_FOOTER,
    ].join('\n\n');

    const repaired = repairStoredVisieFunctiesIntro(stored, 'ad_with_functies');
    const parsed = parseVisieLoopbaanadviseur(repaired);
    assert.equal(parsed.functiesIntro, AD_FUNCTIES_INTRO);
    assert.match(parsed.functieBullets, /Planner logistiek/);
  });

  it('leaves custom intros untouched', () => {
    const custom = 'Handmatig aangepaste intro door adviseur.';
    const stored = [
      TOELICHTING_DELIMITER,
      TOELICHTING_VROUW,
      FUNCTIES_DELIMITER,
      custom,
      '• Planner logistiek: toelichting.',
      FUNCTIE_FOOTER,
    ].join('\n\n');
    assert.equal(repairStoredVisieFunctiesIntro(stored, 'ad_with_functies'), stored);
  });

  it('no-ops when intro already matches scenario', () => {
    const stored = [
      TOELICHTING_DELIMITER,
      TOELICHTING_VROUW,
      FUNCTIES_DELIMITER,
      AD_FUNCTIES_INTRO,
      '• Planner logistiek: toelichting.',
      FUNCTIE_FOOTER,
    ].join('\n\n');
    assert.equal(repairStoredVisieFunctiesIntro(stored, 'ad_with_functies'), stored);
  });
});

describe('Kedzierska prose → scenario', () => {
  it('detects ad_with_functies from prose examples in advies', () => {
    const advies = [
      'Advies.',
      ADVIES_DELIMITER,
      'Voorbeelden van passende functies zijn licht productiewerk dat zittend kan worden gedaan, heftruckchauffeur (certificaat halen) of naaister.',
    ].join('\n');

    const scenario = detectDocumentScenario([], {
      has_ad_report: true,
      ad_report_concept: false,
      advies_ad_passende_arbeid: advies,
    });
    assert.equal(scenario, 'ad_with_functies');
    assert.equal(buildFunctiesIntro(scenario), AD_FUNCTIES_INTRO);
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
    assert.ok(!visie_loopbaanadviseur.includes(FUNCTIE_FOOTER));
    assert.ok(!visie_loopbaanadviseur.includes('• Medewerker'));
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

  it('omits En soortgelijk and keeps all concrete functies (variable count)', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        { naam: 'Functie A', toelichting: 'Passend.' },
        { naam: 'Functie B', toelichting: 'Passend.' },
        { naam: 'Functie C', toelichting: 'Passend.' },
        { naam: 'En soortgelijk', toelichting: '' },
        { naam: 'Functie D', toelichting: 'Ook passend.' },
      ],
    };
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      content,
      'ad_with_functies'
    );
    assert.ok(!visie_loopbaanadviseur.includes('En soortgelijk'));
    assert.match(visie_loopbaanadviseur, /• Functie A: passend\./);
    assert.match(visie_loopbaanadviseur, /• Functie B: passend\./);
    assert.match(visie_loopbaanadviseur, /• Functie C: passend\./);
    assert.match(visie_loopbaanadviseur, /• Functie D: ook passend\./);
  });

  it('emits a single functie when only one is provided', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [{ naam: 'Alleen A', toelichting: 'Passend.' }],
    };
    const { visie_loopbaanadviseur } = buildVisieLoopbaanadviseurFields(
      baseCtx,
      content,
      'ad_with_functies'
    );
    assert.match(visie_loopbaanadviseur, /• Alleen A: passend\./);
    assert.equal(
      (visie_loopbaanadviseur.match(/^• /gm) || []).length,
      1
    );
  });
});

describe('filterVisieLoopbaanadviseurDocs', () => {
  it('filters and prioritizes belastbaarheid, ad, intake', () => {
    assert.equal(getVisieLoopbaanadviseurDocCategory('fml_izp'), 'belastbaarheid');
    assert.equal(getVisieLoopbaanadviseurDocCategory('spreek_reportage'), 'belastbaarheid');
    assert.equal(getVisieLoopbaanadviseurDocCategory('spreekuurrapportage'), 'belastbaarheid');
    assert.equal(getVisieLoopbaanadviseurDocCategory('ad_rapportage'), 'ad');
    assert.equal(getVisieLoopbaanadviseurDocCategory('intakeformulier'), 'intake');

    const filtered = filterVisieLoopbaanadviseurDocs([
      { type: 'intakeformulier', url: 'a' },
      { type: 'ad_rapportage', url: 'b' },
      { type: 'fml_izp', url: 'c' },
      { type: 'spreek_reportage', url: 'e' },
      { type: 'extra', url: 'd' },
    ]);
    assert.deepEqual(
      filtered.map((d) => d.type),
      ['fml_izp', 'spreek_reportage', 'ad_rapportage', 'intakeformulier']
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

describe('toPublishedFuncties', () => {
  it('strips anker fields before publish', async () => {
    const { toPublishedFuncties } = await import('../schema');
    const published = toPublishedFuncties([
      {
        naam: 'Receptionist',
        toelichting: 'Past bij gastvrijheid.',
        anker: 'werkervaring',
        anker_detail: 'hotel',
      },
    ]);
    assert.deepEqual(published, [
      { naam: 'Receptionist', toelichting: 'Past bij gastvrijheid.' },
    ]);
    assert.equal('anker' in published[0], false);
  });
});

describe('parseVisieLoopbaanadviseurContentResult', () => {
  it('parses functies and drops En soortgelijk without hard-capping at 3', async () => {
    const { parseVisieLoopbaanadviseurContentResult } = await import('../schema');
    const result = parseVisieLoopbaanadviseurContentResult({
      functies: [
        { naam: 'A', toelichting: 'x', anker: 'opleiding', anker_detail: 'mbo' },
        { naam: 'B', toelichting: 'y', anker: 'werkervaring', anker_detail: 'admin' },
        { naam: 'C', toelichting: 'z', anker: 'zoekprofiel', anker_detail: 'kantoor' },
        { naam: 'En soortgelijk', toelichting: '' },
        { naam: 'D', toelichting: 'w', anker: 'opleiding', anker_detail: 'hbo' },
      ],
    });
    assert.equal(result.functies.length, 4);
    assert.equal(result.functies[3].naam, 'D');
    assert.equal(result.functies[0].anker, 'opleiding');
    assert.equal(result.functies[0].anker_detail, 'mbo');
  });

  it('caps suggestion parse at batch size 5', async () => {
    const { parseVisieLoopbaanadviseurSuggestionResult } = await import('../schema');
    const result = parseVisieLoopbaanadviseurSuggestionResult({
      functies: [
        { naam: 'A', toelichting: '1', anker: 'opleiding', anker_detail: 'a' },
        { naam: 'B', toelichting: '2', anker: 'opleiding', anker_detail: 'b' },
        { naam: 'C', toelichting: '3', anker: 'werkervaring', anker_detail: 'c' },
        { naam: 'D', toelichting: '4', anker: 'werkervaring', anker_detail: 'd' },
        { naam: 'E', toelichting: '5', anker: 'zoekprofiel', anker_detail: 'e' },
        { naam: 'F', toelichting: '6', anker: 'zoekprofiel', anker_detail: 'f' },
      ],
    });
    assert.equal(result.functies.length, 5);
    assert.equal(result.functies[4].naam, 'E');
  });
});

describe('lowercaseDutchAfterColon', () => {
  it('lowercases the first letter after a colon and keeps abbreviations', () => {
    assert.equal(
      lowercaseDutchAfterColon('De hbo-opleiding biedt een basis.'),
      'de hbo-opleiding biedt een basis.'
    );
    assert.equal(
      lowercaseDutchAfterColon('Haar voorkeur voor systeemwerk.'),
      'haar voorkeur voor systeemwerk.'
    );
    assert.equal(lowercaseDutchAfterColon('HBO-opleiding biedt een basis.'), 'HBO-opleiding biedt een basis.');
    assert.equal(lowercaseDutchAfterColon('de hbo-opleiding'), 'de hbo-opleiding');
  });

  it('capitalizes sentence starts after a period in multi-sentence toelichting', () => {
    assert.equal(
      lowercaseDutchAfterColon('Past bij X. en past bij Y.'),
      'past bij X. En past bij Y.'
    );
    assert.doesNotMatch(lowercaseDutchAfterColon('Past bij X. en past bij Y.'), /\.\s+[a-z]/);
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
