import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPara1Closing,
  buildZoekprofielFields,
  hasV2OpeningSentence,
  nlDate,
  resolveBelastbaarheidsdatum,
  stripCitations,
  type ZoekprofielBuildContext,
} from '../build-fields';
import type { ZoekprofielContentResult } from '../schema';

const baseCtx: ZoekprofielBuildContext = {
  employee: { first_name: 'Jan', last_name: 'Jansen' },
  meta: { fml_izp_lab_date_voluit: '12 december 2025' },
};

const v2Opening =
  'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-2 niveau.';

const baseContent: ZoekprofielContentResult = {
  alinea_1_kern: `${v2Opening} Werknemer heeft de opleiding MBO-2 Facilitaire Dienstverlening afgerond. Hij heeft werkervaring opgedaan als magazijnmedewerker en productiemedewerker in de logistiek en productie.`,
  alinea_2:
    'Passend zijn overzichtelijke en voorspelbare werkzaamheden met een duidelijke taakstructuur. Werkzaamheden waarbij langdurig staan geen wezenlijk onderdeel vormt zijn passend. Werkzaamheden met lichte fysieke belasting zijn passend. Beperkt fysiek belastend werk is passend. Een rustige werkomgeving is passend. Regelmatige werktijden en geen nachtdiensten zijn passend.',
  belastbaarheidsdocument_type: 'fml',
  belastbaarheidsdocument_datum_voluit: '3 februari 2026',
};

describe('buildZoekprofielFields', () => {
  it('joins two paragraphs with server closing appended to paragraph 1', () => {
    const { zoekprofiel } = buildZoekprofielFields(baseCtx, baseContent);
    const parts = zoekprofiel.split('\n\n');
    assert.equal(parts.length, 2);
    assert.match(parts[0], /Op basis van de afgeronde opleiding\(en\)/);
    assert.match(
      parts[0],
      /Functionele Mogelijkhedenlijst van 12 december 2025/
    );
    assert.match(parts[1], /overzichtelijke/);
  });

  it('returns empty string when alinea_1_kern is null', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_1_kern: null,
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    assert.equal(zoekprofiel, '');
  });

  it('strips accidental section heading from alinea text', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_1_kern: `Zoekprofiel ${v2Opening} Werknemer heeft mbo-2 afgerond.`,
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    assert.ok(!zoekprofiel.startsWith('Zoekprofiel'));
    assert.match(zoekprofiel, /mbo-2 afgerond/);
  });

  it('collapses internal newlines within a paragraph', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_2:
        'Werkzaamheden met overzichtelijk werk zijn passend.\n\nBeperkte werkdruk is passend.',
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    const para2 = zoekprofiel.split('\n\n')[1];
    assert.ok(!para2.includes('\n'));
  });

  it('strips pdf citation markers from paragraphs', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_1_kern: `${v2Opening} Tekst [1:2/doc.pdf] meer tekst.`,
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    assert.ok(!zoekprofiel.includes('[1:2/doc.pdf]'));
  });

  it('omits FML/IZP/LAB closing when no belastbaarheidsdocument is available', () => {
    const ctx: ZoekprofielBuildContext = {
      ...baseCtx,
      meta: { ...baseCtx.meta, has_belastbaarheids_doc: false },
    };
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_2: null,
    };

    const { zoekprofiel } = buildZoekprofielFields(ctx, content);
    assert.ok(!zoekprofiel.includes('Functionele Mogelijkhedenlijst'));
    assert.match(zoekprofiel, /Op basis van de afgeronde opleiding\(en\)/);
  });
});

describe('buildPara1Closing', () => {
  it('uses FML template with date', () => {
    const text = buildPara1Closing('fml', '20 januari 2025');
    assert.match(text, /Functionele Mogelijkhedenlijst van 20 januari 2025/);
  });

  it('uses IZP template with date', () => {
    const text = buildPara1Closing('izp', '3 februari 2026');
    assert.match(text, /Inzetbaarheidsprofiel van 3 februari 2026/);
    assert.ok(!text.includes('Functionele Mogelijkhedenlijst'));
  });

  it('uses LAB template with date', () => {
    const text = buildPara1Closing('lab', '19 januari 2026');
    assert.match(
      text,
      /Lijst arbeidsmogelijkheden en beperkingen van 19 januari 2026/
    );
  });
});

describe('resolveBelastbaarheidsdatum', () => {
  it('prefers ctx.meta date over model-extracted date', () => {
    const datum = resolveBelastbaarheidsdatum(baseCtx, baseContent);
    assert.equal(datum, '12 december 2025');
  });

  it('falls back to model-extracted date when meta is empty', () => {
    const ctx: ZoekprofielBuildContext = { employee: {}, meta: {} };
    const datum = resolveBelastbaarheidsdatum(ctx, baseContent);
    assert.equal(datum, '3 februari 2026');
  });
});

describe('hasV2OpeningSentence', () => {
  it('returns true when V2 opening sentence is present', () => {
    assert.equal(
      hasV2OpeningSentence(
        'Op basis van de afgeronde opleiding(en) en werkervaring is werknemer aangewezen op functies op maximaal mbo-2 niveau.'
      ),
      true
    );
  });

  it('returns false when V2 opening sentence is missing', () => {
    assert.equal(
      hasV2OpeningSentence('Werknemer heeft administratieve ervaring.'),
      false
    );
  });
});

describe('nlDate', () => {
  it('formats ISO date to Dutch long form', () => {
    const formatted = nlDate('2025-12-12');
    assert.match(formatted, /2025/);
    assert.match(formatted, /december/i);
  });

  it('returns empty string for invalid date', () => {
    assert.equal(nlDate('invalid'), '');
  });
});

describe('stripCitations', () => {
  it('removes pdf citation markers', () => {
    const cleaned = stripCitations('Tekst [1:2/doc.pdf] meer tekst');
    assert.equal(cleaned, 'Tekst meer tekst');
  });
});

describe('parseZoekprofielContentResult', () => {
  it('coerces belastbaarheidsdocument_type to fml by default', async () => {
    const { parseZoekprofielContentResult } = await import('../schema');
    const result = parseZoekprofielContentResult({
      alinea_1_kern: 'test',
      alinea_2: null,
      belastbaarheidsdocument_type: 'unknown',
      belastbaarheidsdocument_datum_voluit: null,
    });
    assert.equal(result.belastbaarheidsdocument_type, 'fml');
  });

  it('coerces belastbaarheidsdocument_type to lab', async () => {
    const { parseZoekprofielContentResult } = await import('../schema');
    const result = parseZoekprofielContentResult({
      alinea_1_kern: 'test',
      alinea_2: null,
      belastbaarheidsdocument_type: 'lab',
      belastbaarheidsdocument_datum_voluit: null,
    });
    assert.equal(result.belastbaarheidsdocument_type, 'lab');
  });
});
