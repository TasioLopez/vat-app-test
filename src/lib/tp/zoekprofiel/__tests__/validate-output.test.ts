import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPara1Closing, buildZoekprofielFields, countWords } from '../build-fields';
import type { ZoekprofielContentResult } from '../schema';
import { validateZoekprofielOutput } from '../validate-output';

const v2Opening =
  'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-2 niveau.';

const closing = buildPara1Closing('fml', '12 december 2025');

const goodPara2 =
  'Passend zijn overzichtelijke en voorspelbare werkzaamheden met een duidelijke taakstructuur. Werkzaamheden waarbij langdurig staan geen wezenlijk onderdeel vormt zijn passend. Werkzaamheden met lichte fysieke belasting zijn passend. Beperkt fysiek belastend werk en geen zware tillen zijn passend. Een rustige werkomgeving zonder veel lawaai is passend. Regelmatige werktijden en geen nachtdiensten zijn passend. Geleidelijke urenopbouw is passend.';

function assemble(para1Kern: string, para2: string): string {
  return `${para1Kern} ${closing}\n\n${para2}`;
}

const baseCtx = {
  employee: {},
  meta: { fml_izp_lab_date_voluit: '12 december 2025', has_belastbaarheids_doc: true },
};

const baseContent: ZoekprofielContentResult = {
  alinea_1_kern: `${v2Opening} Werknemer heeft de opleiding MBO-2 Facilitaire Dienstverlening afgerond.`,
  alinea_2: goodPara2,
  belastbaarheidsdocument_type: 'fml',
  belastbaarheidsdocument_datum_voluit: '12 december 2025',
};

/** A/B fixtures — VAT (app) style outputs that should fail validation. */
const bepVatPara1 = `${v2Opening} Werknemer heeft de opleiding Huishoudschool afgerond. Zij heeft meerdere jaren werkervaring opgedaan als zorgmedewerker waar zij verantwoordelijk is voor ondersteunende productiewerkzaamheden en beschikt over gemiddelde computervaardigheden.`;

const calvinVatPara1 = `${v2Opening} Werknemer is gestart met MBO-2 maar niet afgerond. Hij heeft werkervaring opgedaan als aspirant beveiliger binnen de beveiligingssector en stagiair webdeveloper in een digitale/IT-omgeving.`;

const nikkiVatPara1 = `${v2Opening.replace('mbo-2', 'mbo-3')} Werknemer heeft VMBO afgerond en diverse cursussen gevolgd. Zij heeft werkervaring waarbij zij verantwoordelijk was voor coördineren en rapporteren.`;

const lenieVatPara1 = `${v2Opening.replace('mbo-2', 'vmbo-niveau')}. Werknemer heeft 25 jaar werkervaring en beschikt over een VCA-certificaat en rijbewijs B.`;

const sandraVatPara1 =
  'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-4 niveau. Werknemer heeft middelbare school, MBO-SPW en apothekersassistent afgerond naast de PDG.';

const bepVatPara2 =
  'Werknemer kan maximaal 10 kilogram tillen en maximaal 15 kilogram dragen. Zittend werk gedurende vier uur per dag is passend. Werktijden tussen 06.00 en 22.00 uur zijn passend.';

/** ChatGPT-style outputs that should pass key validation checks. */
const bepChatGptPara1 = `${v2Opening} Werknemer heeft de opleiding Huishoudschool afgerond. Zij heeft werkervaring opgedaan als zorgmedewerker en als operator productie II binnen een bakkerij.`;

const calvinChatGptPara1 = `${v2Opening} Werknemer heeft de opleiding MBO-2 Facilitaire Dienstverlening afgerond. Hij heeft werkervaring opgedaan als maaltijdbezorger, webdeveloper en beveiliger.`;

describe('validateZoekprofielOutput — A/B VAT fixtures', () => {
  it('flags Bep VAT para 1 task detail and forbidden terms', () => {
    const zoekprofiel = assemble(bepVatPara1, goodPara2);
    const result = validateZoekprofielOutput(zoekprofiel, bepVatPara1, baseCtx, baseContent);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'para1_task_detail'));
    assert.ok(result.issues.some((i) => i.code === 'forbidden_term'));
  });

  it('flags Calvin VAT para 1 sector redundancy and stagiair', () => {
    const zoekprofiel = assemble(calvinVatPara1, goodPara2);
    const result = validateZoekprofielOutput(zoekprofiel, calvinVatPara1, baseCtx, baseContent);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'redundant_sector'));
    assert.ok(result.issues.some((i) => i.code === 'forbidden_term'));
  });

  it('flags Nikki VAT para 1 task detail', () => {
    const zoekprofiel = assemble(nikkiVatPara1, goodPara2);
    const result = validateZoekprofielOutput(zoekprofiel, nikkiVatPara1, baseCtx, baseContent);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'para1_task_detail'));
  });

  it('flags Lenie VAT para 1 forbidden extras', () => {
    const zoekprofiel = assemble(lenieVatPara1, goodPara2);
    const result = validateZoekprofielOutput(zoekprofiel, lenieVatPara1, baseCtx, baseContent);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'forbidden_term'));
    assert.ok(result.issues.some((i) => i.code === 'para1_task_detail'));
  });

  it('flags Bep VAT para 2 numeric FML copy', () => {
    const para1 = bepChatGptPara1;
    const zoekprofiel = assemble(para1, bepVatPara2);
    const result = validateZoekprofielOutput(zoekprofiel, para1, baseCtx, baseContent);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'numeric_fml_copy'));
  });
});

describe('validateZoekprofielOutput — ChatGPT-style fixtures', () => {
  it('accepts Bep ChatGPT-style para 1 (no task/forbidden issues)', () => {
    const zoekprofiel = assemble(bepChatGptPara1, goodPara2);
    const result = validateZoekprofielOutput(zoekprofiel, bepChatGptPara1, baseCtx, baseContent);
    assert.ok(!result.issues.some((i) => i.code === 'para1_task_detail'));
    assert.ok(!result.issues.some((i) => i.code === 'forbidden_term'));
    assert.ok(!result.issues.some((i) => i.code === 'redundant_sector'));
  });

  it('accepts Calvin ChatGPT-style para 1 (no sector/stagiair issues)', () => {
    const zoekprofiel = assemble(calvinChatGptPara1, goodPara2);
    const result = validateZoekprofielOutput(zoekprofiel, calvinChatGptPara1, baseCtx, baseContent);
    assert.ok(!result.issues.some((i) => i.code === 'redundant_sector'));
    assert.ok(!result.issues.some((i) => i.code === 'forbidden_term'));
  });

  it('flags over 225 words', () => {
    const longPara2 = `${goodPara2} ${goodPara2} ${goodPara2}`;
    const zoekprofiel = assemble(bepChatGptPara1, longPara2);
    const result = validateZoekprofielOutput(zoekprofiel, bepChatGptPara1, baseCtx, baseContent);
    assert.ok(result.issues.some((i) => i.code === 'word_count_high'));
  });
});

describe('validateZoekprofielOutput — closing', () => {
  it('flags missing FML/IZP/LAB closing when belastbaarheids doc expected', () => {
    const para1Only = `${bepChatGptPara1}`;
    const zoekprofiel = `${para1Only}\n\n${goodPara2}`;
    const result = validateZoekprofielOutput(zoekprofiel, para1Only, baseCtx, baseContent);
    assert.ok(result.issues.some((i) => i.code === 'missing_closing'));
  });
});

describe('buildZoekprofielFields — closing and validation', () => {
  it('always appends FML closing when has_belastbaarheids_doc is true', () => {
    const content: ZoekprofielContentResult = {
      alinea_1_kern: `${v2Opening} Werknemer heeft mbo-2 afgerond. Hij heeft werkervaring opgedaan als magazijnmedewerker.`,
      alinea_2: goodPara2,
      belastbaarheidsdocument_type: 'izp',
      belastbaarheidsdocument_datum_voluit: '5 december 2025',
    };
    const ctx = {
      employee: {},
      meta: { fml_izp_lab_date_voluit: '5 december 2025', has_belastbaarheids_doc: true },
    };

    const { zoekprofiel } = buildZoekprofielFields(ctx, content);
    assert.match(zoekprofiel, /Inzetbaarheidsprofiel van 5 december 2025/);
    const validation = validateZoekprofielOutput(
      zoekprofiel,
      content.alinea_1_kern!,
      ctx,
      content
    );
    assert.ok(!validation.issues.some((i) => i.code === 'missing_closing'));
  });

  it('returns validationIssues when output violates rules', () => {
    const content: ZoekprofielContentResult = {
      alinea_1_kern: bepVatPara1,
      alinea_2: bepVatPara2,
      belastbaarheidsdocument_type: 'fml',
      belastbaarheidsdocument_datum_voluit: '12 december 2025',
    };

    const { validationIssues } = buildZoekprofielFields(baseCtx, content);
    assert.ok(validationIssues && validationIssues.length > 0);
  });
});

describe('manual QA checklist — automated proxy', () => {
  const qaCases = [
    { name: 'Bep', para1: bepChatGptPara1 },
    { name: 'Calvin', para1: calvinChatGptPara1 },
    { name: 'Nikki', para1: nikkiVatPara1.replace(/verantwoordelijk was voor coördineren en rapporteren/, 'als administratief medewerker') },
    { name: 'Lenie', para1: `${v2Opening.replace('mbo-2', 'LHNO-niveau')}. Werknemer heeft de opleiding LHNO afgerond. Zij heeft werkervaring opgedaan als productiemedewerker.` },
    { name: 'Sandra', para1: 'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal hbo niveau. Werknemer heeft de PDG afgerond.' },
  ];

  for (const qa of qaCases) {
    it(`${qa.name}: para 1 passes ChatGPT-style checks`, () => {
      const zoekprofiel = assemble(qa.para1, goodPara2);
      const result = validateZoekprofielOutput(zoekprofiel, qa.para1, baseCtx, baseContent);
      assert.ok(!result.issues.some((i) => i.code === 'para1_task_detail'));
      assert.ok(!result.issues.some((i) => i.code === 'forbidden_term'));
      assert.ok(!result.issues.some((i) => i.code === 'redundant_sector'));
      assert.ok(!result.issues.some((i) => i.code === 'numeric_fml_copy'));
    });
  }

  it('assembled ChatGPT-style output is within word budget when padded', () => {
    const zoekprofiel = assemble(calvinChatGptPara1, goodPara2);
    const words = countWords(zoekprofiel);
    assert.ok(words >= 100, `expected reasonable length, got ${words}`);
    assert.ok(words <= 225, `expected max 225 words, got ${words}`);
  });
});
