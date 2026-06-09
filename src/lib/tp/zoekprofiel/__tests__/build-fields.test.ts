import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAlinea2,
  buildZoekprofielFields,
  hasNiveauSentence,
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

const baseContent: ZoekprofielContentResult = {
  alinea_1:
    'Werknemer heeft werkervaring als administratief medewerker. Werknemer heeft mbo-4 afgerond. Werknemer is aangewezen op functies op maximaal mbo-niveau. Passende arbeid ligt in administratieve functies.',
  alinea_3:
    'Werknemer is aangewezen op werkzaamheden met een duidelijke structuur en beperkte werkdruk.',
  alinea_4:
    'Werknemer is aangewezen op werkzaamheden met beperkte til- en draagbelasting en afwisseling van houding.',
  heeft_fysieke_beperkingen: true,
  belastbaarheidsdocument_type: 'fml',
  belastbaarheidsdocument_datum_voluit: '3 februari 2026',
};

describe('buildZoekprofielFields', () => {
  it('joins four alinea paragraphs with double newlines including server alinea_2', () => {
    const { zoekprofiel } = buildZoekprofielFields(baseCtx, baseContent);
    const parts = zoekprofiel.split('\n\n');
    assert.equal(parts.length, 4);
    assert.match(parts[0], /mbo-niveau/);
    assert.match(parts[1], /Functionele Mogelijkheden Lijst opgesteld op 12 december 2025/);
    assert.match(parts[2], /duidelijke structuur/);
    assert.match(parts[3], /til- en draagbelasting/);
  });

  it('returns three paragraphs when heeft_fysieke_beperkingen is false', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      heeft_fysieke_beperkingen: false,
      alinea_4: null,
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    assert.equal(zoekprofiel.split('\n\n').length, 3);
    assert.ok(!zoekprofiel.includes('til- en draagbelasting'));
  });

  it('returns empty string when alinea_1 is null', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_1: null,
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    assert.equal(zoekprofiel, '');
  });

  it('strips accidental section heading from alinea text', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_1:
        'Zoekprofiel Werknemer heeft werkervaring als magazijnmedewerker. Werknemer is aangewezen op functies op maximaal vmbo-niveau.',
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    assert.ok(!zoekprofiel.startsWith('Zoekprofiel'));
    assert.match(zoekprofiel, /magazijnmedewerker/);
  });

  it('collapses internal newlines within a paragraph', () => {
    const content: ZoekprofielContentResult = {
      ...baseContent,
      alinea_3: 'Werknemer is aangewezen op overzichtelijk werk.\n\nBeperkte werkdruk is passend.',
    };

    const { zoekprofiel } = buildZoekprofielFields(baseCtx, content);
    const alinea3 = zoekprofiel.split('\n\n')[2];
    assert.ok(!alinea3.includes('\n'));
  });
});

describe('buildAlinea2', () => {
  it('uses FML template with date', () => {
    const text = buildAlinea2('fml', '20 januari 2025');
    assert.match(text, /Functionele Mogelijkheden Lijst opgesteld op 20 januari 2025/);
  });

  it('uses IZP template with date', () => {
    const text = buildAlinea2('izp', '3 februari 2026');
    assert.match(text, /Inzetbaarheidsprofiel opgesteld op 3 februari 2026/);
    assert.ok(!text.includes('Functionele Mogelijkheden Lijst'));
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

describe('hasNiveauSentence', () => {
  it('returns true when niveau sentence is present', () => {
    assert.equal(
      hasNiveauSentence('Werknemer is aangewezen op functies op maximaal mbo-niveau.'),
      true
    );
  });

  it('returns false when niveau sentence is missing', () => {
    assert.equal(hasNiveauSentence('Werknemer heeft administratieve ervaring.'), false);
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
      alinea_1: 'test',
      alinea_3: null,
      alinea_4: null,
      heeft_fysieke_beperkingen: false,
      belastbaarheidsdocument_type: 'unknown',
      belastbaarheidsdocument_datum_voluit: null,
    });
    assert.equal(result.belastbaarheidsdocument_type, 'fml');
  });
});
