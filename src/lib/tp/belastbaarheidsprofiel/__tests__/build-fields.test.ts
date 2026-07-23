import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBelastbaarheidsprofielBlock,
  buildBelastbaarheidsprofielFields,
  parseBelastbaarheidsprofiel,
} from '../build-fields';
import { PROGNOSE_DELIMITER } from '../constants';
import { mergeBelastbaarheidsprofielContent } from '../merge-content';
import type { BelastbaarheidsprofielContentResult } from '../schema';
import { parseSpreekuurContentResult } from '../spreekuur-schema';

const nikkiCtx = {
  meta: {
    fml_izp_lab_date: '2026-01-23',
    occupational_doctor_org:
      'Arts L. Bollen werkend onder supervisie van arts T. de Haas',
  },
};

const KELLY_INTAKE_QUOTE =
  'Er zijn benutbare mogelijkheden. Terugkeer in eigen werk is onzeker maar niet uitgesloten. Belastbaarheid kan verder verbeteren. Arbeidsdeskundig onderzoek noodzakelijk.';

const baseContent: BelastbaarheidsprofielContentResult = {
  rubrieken: ['Persoonlijk functioneren', 'Werktijden'],
  prognose_citaat: KELLY_INTAKE_QUOTE,
  spreekuur_meta: null,
};

describe('buildBelastbaarheidsprofielFields', () => {
  it('assembles FML intro, rubrieken, spreekuur intro and intake Sectie 5 prognose quote', () => {
    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, baseContent);

    assert.match(prognose_bedrijfsarts, /Functionele Mogelijkheden Lijst \(FML\) van 23 januari 2026/);
    assert.match(
      prognose_bedrijfsarts,
      /Arts L\. Bollen werkend onder supervisie van arts T\. de Haas/
    );
    assert.match(prognose_bedrijfsarts, /• Persoonlijk functioneren/);
    assert.match(prognose_bedrijfsarts, /medisch spreekuur/);
    assert.ok(prognose_bedrijfsarts.includes(PROGNOSE_DELIMITER));

    const prognosePart = prognose_bedrijfsarts.split(PROGNOSE_DELIMITER)[1] ?? '';
    assert.match(prognosePart, /Er zijn benutbare mogelijkheden/);
    assert.match(prognosePart, /Arbeidsdeskundig onderzoek noodzakelijk/);
  });

  it('omits prognose block when intake Sectie 5 quote is empty', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren'],
      prognose_citaat: null,
      spreekuur_meta: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    assert.doesNotMatch(prognose_bedrijfsarts, new RegExp(PROGNOSE_DELIMITER));
    assert.match(prognose_bedrijfsarts, /medisch spreekuur/);
  });

  it('uses spreekuur meta for both intro paragraphs when present', () => {
    const content: BelastbaarheidsprofielContentResult = {
      ...baseContent,
      rubrieken: ['Statische houdingen'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: {
        datum: '2026-12-05',
        arts_org: 'C.J. de Bode',
      },
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);

    assert.match(prognose_bedrijfsarts, /Functionele Mogelijkheden Lijst \(FML\) van 5 december 2026/);
    assert.match(prognose_bedrijfsarts, /Arts C\.J\. de Bode, beperkingen/);
    assert.match(prognose_bedrijfsarts, /door Arts C\.J\. de Bode, staat onderstaande/);
    assert.match(prognose_bedrijfsarts, /• Statische houdingen/);
    assert.doesNotMatch(prognose_bedrijfsarts, /23 januari 2026/);
    assert.doesNotMatch(prognose_bedrijfsarts, /L\. Bollen/);
  });

  it('preserves Verzekeringsarts in both intro paragraphs', () => {
    const kellyCtx = {
      meta: {
        fml_izp_lab_date: '2026-04-29',
        occupational_doctor_org: 'Verzekeringsarts Ankersmit',
      },
    };
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(kellyCtx, content);

    assert.match(
      prognose_bedrijfsarts,
      /opgesteld door Verzekeringsarts Ankersmit, beperkingen/
    );
    assert.match(
      prognose_bedrijfsarts,
      /door Verzekeringsarts Ankersmit, staat onderstaande/
    );
    assert.doesNotMatch(prognose_bedrijfsarts, /opgesteld door arts Ankersmit/);
  });

  it('enriches spreekuur name-only arts_org with Verzekeringsarts from meta', () => {
    const kellyCtx = {
      meta: {
        fml_izp_lab_date: '2026-04-29',
        occupational_doctor_org: 'Verzekeringsarts Ankersmit',
      },
    };
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Statische houdingen'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: {
        datum: '2026-04-29',
        arts_org: 'Ankersmit',
      },
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(kellyCtx, content);

    assert.match(prognose_bedrijfsarts, /door Verzekeringsarts Ankersmit, staat onderstaande/);
    assert.match(prognose_bedrijfsarts, /opgesteld door Verzekeringsarts Ankersmit, beperkingen/);
  });

  it('preserves supervisie doctor phrase verbatim', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Sociaal functioneren'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    assert.match(
      prognose_bedrijfsarts,
      /opgesteld door Arts L\. Bollen werkend onder supervisie van arts T\. de Haas, beperkingen/
    );
    assert.match(
      prognose_bedrijfsarts,
      /door Arts L\. Bollen werkend onder supervisie van arts T\. de Haas, staat onderstaande/
    );
  });

  it('merges supervisie from tp_meta when spreekuur arts_org lacks supervisie (Melissa case)', () => {
    const melissaCtx = {
      meta: {
        fml_izp_lab_date: '2026-05-27',
        occupational_doctor_org:
          'Arts M. Stevens werkend onder supervisie van Bedrijfsarts M. Montagne',
      },
    };
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: {
        datum: '2026-05-27',
        arts_org: 'Arts M. Stevens',
      },
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(melissaCtx, content);
    assert.match(
      prognose_bedrijfsarts,
      /opgesteld door Arts M\. Stevens werkend onder supervisie van Bedrijfsarts M\. Montagne, beperkingen/
    );
    assert.match(
      prognose_bedrijfsarts,
      /door Arts M\. Stevens werkend onder supervisie van Bedrijfsarts M\. Montagne, staat onderstaande/
    );
  });

  it('expands BA/VA abbreviations in occupational_doctor_org intros (Hippman leak)', () => {
    const hippmanCtx = {
      meta: {
        fml_izp_lab_date: '2026-06-09',
        occupational_doctor_org:
          'VA P. Mort werkend onder supervisie van BA K. Julien',
      },
    };
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(hippmanCtx, content);
    assert.match(
      prognose_bedrijfsarts,
      /opgesteld door Verzekeringsarts P\. Mort werkend onder supervisie van Bedrijfsarts K\. Julien, beperkingen/
    );
    assert.match(
      prognose_bedrijfsarts,
      /door Verzekeringsarts P\. Mort werkend onder supervisie van Bedrijfsarts K\. Julien, staat onderstaande/
    );
    assert.doesNotMatch(prognose_bedrijfsarts, /\bVA\b/);
    assert.doesNotMatch(prognose_bedrijfsarts, /\bBA\b/);
  });

  it('uses default rubrieken when model returns empty list', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: [],
      prognose_citaat: null,
      spreekuur_meta: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    assert.match(prognose_bedrijfsarts, /• Persoonlijk functioneren/);
    assert.match(prognose_bedrijfsarts, /• Werktijden/);
    assert.doesNotMatch(prognose_bedrijfsarts, new RegExp(PROGNOSE_DELIMITER));
  });
});

describe('parseBelastbaarheidsprofiel / buildBelastbaarheidsprofielBlock', () => {
  it('splits and reassembles around PROGNOSE delimiter', () => {
    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, baseContent);
    const parsed = parseBelastbaarheidsprofiel(prognose_bedrijfsarts);

    assert.ok(parsed.limitationsBlock.includes('Functionele Mogelijkheden Lijst'));
    assert.ok(parsed.prognoseQuote.includes('benutbare mogelijkheden'));
    assert.equal(
      buildBelastbaarheidsprofielBlock(parsed.limitationsBlock, parsed.prognoseQuote),
      prognose_bedrijfsarts
    );
  });

  it('returns whole text as limitations when delimiter absent', () => {
    const raw = 'Alleen beperkingen zonder prognose.';
    assert.deepEqual(parseBelastbaarheidsprofiel(raw), {
      limitationsBlock: raw,
      prognoseQuote: '',
    });
    assert.equal(buildBelastbaarheidsprofielBlock(raw, ''), raw);
  });

  it('preserves trailing and internal spaces in belastbaarheidsprofiel round-trip', () => {
    const limitations = 'beperkingen  tekst ';
    const quote = 'prognose citaat ';
    const block = buildBelastbaarheidsprofielBlock(limitations, quote);
    const parsed = parseBelastbaarheidsprofiel(block);
    assert.equal(parsed.limitationsBlock, limitations);
    assert.equal(parsed.prognoseQuote, quote);
  });
});

describe('mergeBelastbaarheidsprofielContent', () => {
  it('prefers spreekuur rubrieken while keeping main prognose_citaat from intake', () => {
    const main: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren'],
      prognose_citaat: KELLY_INTAKE_QUOTE,
      spreekuur_meta: null,
    };

    const merged = mergeBelastbaarheidsprofielContent(
      main,
      {
        datum: '2026-12-05',
        arts_org: 'C.J. de Bode',
        rubrieken: ['Werktijden', 'Statische houdingen'],
      },
      true
    );

    assert.deepEqual(merged.rubrieken, ['Werktijden', 'Statische houdingen']);
    assert.equal(merged.prognose_citaat, KELLY_INTAKE_QUOTE);
    assert.deepEqual(merged.spreekuur_meta, {
      datum: '2026-12-05',
      arts_org: 'C.J. de Bode',
    });
  });

  it('falls back to main content when no spreekuur doc', () => {
    const merged = mergeBelastbaarheidsprofielContent(baseContent, null, false);
    assert.deepEqual(merged, { ...baseContent, spreekuur_meta: null });
  });

  it('falls back to main when spreekuur extraction is empty', () => {
    const merged = mergeBelastbaarheidsprofielContent(
      baseContent,
      { datum: null, arts_org: null, rubrieken: [] },
      true
    );
    assert.equal(merged.spreekuur_meta, null);
    assert.equal(merged.prognose_citaat, baseContent.prognose_citaat);
    assert.deepEqual(merged.rubrieken, baseContent.rubrieken);
  });

  it('falls back main rubrieken when spreekuur has meta but empty rubrieken', () => {
    const merged = mergeBelastbaarheidsprofielContent(
      baseContent,
      {
        datum: '2026-12-05',
        arts_org: 'C.J. de Bode',
        rubrieken: [],
      },
      true
    );

    assert.deepEqual(merged.rubrieken, baseContent.rubrieken);
    assert.equal(merged.prognose_citaat, baseContent.prognose_citaat);
  });
});

describe('parseSpreekuurContentResult', () => {
  it('parses spreekuur schema fields', () => {
    const parsed = parseSpreekuurContentResult({
      datum: '2026-12-05',
      arts_org: 'Arts X werkend onder supervisie van arts Y',
      rubrieken: ['Werktijden'],
    });

    assert.equal(parsed.datum, '2026-12-05');
    assert.equal(parsed.arts_org, 'Arts X werkend onder supervisie van arts Y');
    assert.deepEqual(parsed.rubrieken, ['Werktijden']);
  });
});
