import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBelastbaarheidsprofielFields } from '../build-fields';
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

const baseContent: BelastbaarheidsprofielContentResult = {
  rubrieken: ['Persoonlijk functioneren', 'Werktijden'],
  prognose_citaat:
    'Op basis van de huidige ontvangen informatie is de geschatte prognose positief.',
  reintegratieadvies_citaat: 'Werknemer kan deels hervatten in aangepast werk.',
  spreekuur_meta: null,
};

describe('buildBelastbaarheidsprofielFields', () => {
  it('assembles FML intro, rubrieken, spreekuur intro and prognose block', () => {
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
    const prognoseIdx = prognosePart.indexOf('positief');
    const reintIdx = prognosePart.indexOf('aangepast werk');
    assert.ok(prognoseIdx >= 0 && reintIdx >= 0);
    assert.ok(prognoseIdx < reintIdx, 'prognose quote should come before reintegratieadvies');
  });

  it('uses spreekuur meta for both intro paragraphs when present', () => {
    const content: BelastbaarheidsprofielContentResult = {
      ...baseContent,
      rubrieken: ['Statische houdingen'],
      prognose_citaat: 'Prognose uit spreekuurrapportage.',
      spreekuur_meta: {
        datum: '2026-12-05',
        arts_org: 'C.J. de Bode',
      },
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);

    assert.match(prognose_bedrijfsarts, /Functionele Mogelijkheden Lijst \(FML\) van 5 december 2026/);
    assert.match(prognose_bedrijfsarts, /arts C\.J\. de Bode, beperkingen/);
    assert.match(prognose_bedrijfsarts, /door arts C\.J\. de Bode, staat onderstaande/);
    assert.match(prognose_bedrijfsarts, /• Statische houdingen/);
    assert.doesNotMatch(prognose_bedrijfsarts, /23 januari 2026/);
    assert.doesNotMatch(prognose_bedrijfsarts, /L\. Bollen/);
  });

  it('preserves supervisie doctor phrase verbatim', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Sociaal functioneren'],
      prognose_citaat: 'Prognose tekst.',
      reintegratieadvies_citaat: null,
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

  it('uses default rubrieken when model returns empty list', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: [],
      prognose_citaat: null,
      reintegratieadvies_citaat: null,
      spreekuur_meta: null,
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    assert.match(prognose_bedrijfsarts, /• Persoonlijk functioneren/);
    assert.match(prognose_bedrijfsarts, /• Werktijden/);
  });

  it('keeps AD reintegratieadvies alongside spreekuur prognose', () => {
    const content: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Dynamische handelingen'],
      prognose_citaat: 'Spreekuur prognose.',
      reintegratieadvies_citaat: 'AD re-integratieadvies blijft staan.',
      spreekuur_meta: {
        datum: '2026-12-05',
        arts_org: 'C.J. de Bode',
      },
    };

    const { prognose_bedrijfsarts } = buildBelastbaarheidsprofielFields(nikkiCtx, content);
    const prognosePart = prognose_bedrijfsarts.split(PROGNOSE_DELIMITER)[1] ?? '';
    assert.ok(prognosePart.includes('Spreekuur prognose.'));
    assert.ok(prognosePart.includes('AD re-integratieadvies blijft staan.'));
  });
});

describe('mergeBelastbaarheidsprofielContent', () => {
  it('prefers spreekuur rubrieken and prognose while keeping AD reintegratieadvies', () => {
    const main: BelastbaarheidsprofielContentResult = {
      rubrieken: ['Persoonlijk functioneren'],
      prognose_citaat: 'AD prognose.',
      reintegratieadvies_citaat: 'AD reintegratie.',
      spreekuur_meta: null,
    };

    const merged = mergeBelastbaarheidsprofielContent(
      main,
      {
        datum: '2026-12-05',
        arts_org: 'C.J. de Bode',
        rubrieken: ['Werktijden', 'Statische houdingen'],
        prognose_citaat: 'Spreekuur prognose.',
      },
      true
    );

    assert.deepEqual(merged.rubrieken, ['Werktijden', 'Statische houdingen']);
    assert.equal(merged.prognose_citaat, 'Spreekuur prognose.');
    assert.equal(merged.reintegratieadvies_citaat, 'AD reintegratie.');
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
      { datum: null, arts_org: null, rubrieken: [], prognose_citaat: null },
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
        prognose_citaat: 'Spreekuur prognose.',
      },
      true
    );

    assert.deepEqual(merged.rubrieken, baseContent.rubrieken);
    assert.equal(merged.prognose_citaat, 'Spreekuur prognose.');
  });
});

describe('parseSpreekuurContentResult', () => {
  it('parses spreekuur schema fields', () => {
    const parsed = parseSpreekuurContentResult({
      datum: '2026-12-05',
      arts_org: 'Arts X werkend onder supervisie van arts Y',
      rubrieken: ['Werktijden'],
      prognose_citaat: 'Letterlijke prognose.',
    });

    assert.equal(parsed.datum, '2026-12-05');
    assert.equal(parsed.arts_org, 'Arts X werkend onder supervisie van arts Y');
    assert.deepEqual(parsed.rubrieken, ['Werktijden']);
    assert.equal(parsed.prognose_citaat, 'Letterlijke prognose.');
  });
});
