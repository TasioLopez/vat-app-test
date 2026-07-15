import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assemblePowMeterContent,
  buildHuidigeTredeText,
  buildPowInschalingBlock,
  buildPowMeterFields,
  buildToelichtingText,
  buildVerwachtingText,
  clampInschalingText,
  countWords,
  hasToelichtingOpener,
  hasVerwachtingOpener,
  parsePowInschaling,
  parsePowToelichting,
  stripForbiddenToelichtingPhrases,
} from '../build-fields';
import {
  INSCHALING_DELIMITER,
  INSCHALING_ROW_LABELS,
  INSCHALING_STYLE_REFERENCE_V10,
  MAX_SENTENCES_VERWACHTING,
  MAX_WORDS_TOELICHTING,
  MAX_WORDS_VERWACHTING,
  MAX_WORDS_WERKZAME_UREN,
  SPOOR2_VERWACHTING_BLOCK,
  TOELICHTING_POW_DELIMITER,
  VERWACHTING_OPENER,
} from '../constants';
import type { PowMeterContentResult } from '../schema';

const baseContent: PowMeterContentResult = {
  huidige_trede_nummer: 2,
  huidige_werkzame_uren:
    'Werknemer werkt momenteel 0,5 uur per week. Zij verricht geen betaald werk.',
  verwachting_trede_nummer: 3,
  verwachting_kern:
    'Dit kan worden gerealiseerd door een gefaseerde urenopbouw binnen spoor 1 of door het vinden van een passende activerings- of werkervaringsplaats.',
  toelichting_kern:
    'werknemer beperkt buitenshuis actief is en nog geen structurele werkzaamheden verricht. De actuele werkuren bedragen 0,5 uur per week.',
};

describe('buildPowMeterFields V10', () => {
  it('assembles server trede sentence and openers into combined pow_meter storage', () => {
    const { pow_meter } = buildPowMeterFields(baseContent);

    assert.ok(pow_meter.startsWith(INSCHALING_DELIMITER));
    assert.ok(pow_meter.includes(TOELICHTING_POW_DELIMITER));
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.equal(parsed!.huidige_trede, buildHuidigeTredeText(2));
    assert.match(parsed!.werkzame_uren, /0,5 uur per week/);
    assert.ok(hasVerwachtingOpener(parsed!.verwachting));
    assert.match(parsed!.verwachting, /trede 3/);
    const toelichting = parsePowToelichting(pow_meter);
    assert.ok(hasToelichtingOpener(toelichting, 2));
    assert.match(toelichting, /omdat werknemer beperkt buitenshuis actief is/);
  });

  it('sanitizes toelichting by removing FML dates and bedrijfsarts attribution phrases', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      huidige_trede_nummer: 3,
      toelichting_kern:
        'de bedrijfsarts benutbare mogelijkheden heeft vastgelegd in de FML van 29 april 2026 met een urenbeperking tot circa 2 uur per dag en 10 uur per week, maar werknemer op dit moment geen werk verricht en 0 uur per week werkt.',
    };

    const { pow_meter } = buildPowMeterFields(content);
    const toelichting = parsePowToelichting(pow_meter);

    assert.ok(hasToelichtingOpener(toelichting, 3));
    assert.equal(/\bbedrijfsarts\b/i.test(toelichting), false);
    assert.equal(/\bFML\b/i.test(toelichting), false);
    assert.equal(/29\s+april\s+2026/i.test(toelichting), false);
    assert.equal(/benutbare\s+mogelijkheden/i.test(toelichting), false);

    // The substantive clause should remain.
    assert.match(toelichting, /urenbeperking/i);
    assert.match(toelichting, /0\s+uur\s+per\s+week/i);
  });

  it('strips benutbare mogelijkheden decision-tree jargon from toelichting (Melissa case)', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      huidige_trede_nummer: 3,
      toelichting_kern:
        'werknemer wel benutbare mogelijkheden heeft maar haar belastbaarheid laag is en er een duidelijke urenbeperking geldt met een advies voor zeer geleidelijke opbouw. Zij komt wekelijks naar het werk voor circa anderhalf uur aangepast werk.',
    };

    const { pow_meter } = buildPowMeterFields(content);
    const toelichting = parsePowToelichting(pow_meter);

    assert.ok(hasToelichtingOpener(toelichting, 3));
    assert.equal(/benutbare\s+mogelijkheden/i.test(toelichting), false);
    assert.match(toelichting, /omdat haar belastbaarheid/i);
    assert.match(toelichting, /urenbeperking/i);
  });

  it('strips leaked verwachting opener from model kernel', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      verwachting_kern:
        'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™. Verwachte opbouw via spoor 1.',
    };
    const assembled = assemblePowMeterContent(content);
    assert.equal(
      assembled.verwachting_3_maanden,
      'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™. Verwachte opbouw via spoor 1.'
    );
  });

  it('includes Spoor 2 block in verwachting when present in kern', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      verwachting_kern: `Verwachte groei via spoor 1. ${SPOOR2_VERWACHTING_BLOCK}`,
    };
    const { pow_meter } = buildPowMeterFields(content);
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed!.verwachting.includes('binnen het tweede spoor arbeidsoriëntatie'));
  });

  it('clamps overlong werkzame uren from model output', () => {
    const longContent: PowMeterContentResult = {
      ...baseContent,
      huidige_werkzame_uren:
        'Werknemer verricht momenteel geen arbeid bij de voormalige eigen werkgever of elders en is volledig arbeidsongeschikt gemeld met een traject dat gericht is op herstel en geleidelijke opbouw van activiteiten en belastbaarheid in de komende periode en daarnaast nog weinig uren realiseert.',
    };
    const { pow_meter } = buildPowMeterFields(longContent);
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.ok(countWords(parsed!.werkzame_uren) <= MAX_WORDS_WERKZAME_UREN);
  });

  it('clamps toelichting to max words', () => {
    const longKern = 'onderbouwing '.repeat(80);
    const content: PowMeterContentResult = {
      ...baseContent,
      toelichting_kern: longKern,
    };
    const { pow_meter } = buildPowMeterFields(content);
    const toelichting = parsePowToelichting(pow_meter);
    assert.ok(countWords(toelichting) <= MAX_WORDS_TOELICHTING);
  });

  it('parsePowInschaling round-trips buildPowInschalingBlock', () => {
    const block = buildPowInschalingBlock({
      huidige_trede: buildHuidigeTredeText(1),
      werkzame_uren: 'Geen uren',
      verwachting: buildVerwachtingText(2, 'Opbouw via spoor 1.'),
    });
    const parsed = parsePowInschaling(block);
    assert.ok(parsed);
    assert.match(parsed!.huidige_trede, /trede 1/);
    assert.ok(hasVerwachtingOpener(parsed!.verwachting));
  });

  it('exposes expected table row labels', () => {
    assert.equal(INSCHALING_ROW_LABELS.huidige_trede, 'Huidige trede POW-meter™');
    assert.equal(INSCHALING_ROW_LABELS.werkzame_uren, 'Huidige werkzame uren');
    assert.equal(INSCHALING_ROW_LABELS.verwachting, 'Verwachting over 3 maanden');
  });

  it('style reference V10 mentions trede sentence pattern', () => {
    assert.ok(INSCHALING_STYLE_REFERENCE_V10.includes('trede 2'));
  });
});

describe('stripForbiddenToelichtingPhrases', () => {
  it('removes wel benutbare mogelijkheden heeft maar', () => {
    const result = stripForbiddenToelichtingPhrases(
      'Werknemer bevindt zich tijdens de intake in trede 3 van de POW-meter™ omdat werknemer wel benutbare mogelijkheden heeft maar haar belastbaarheid laag is.'
    );
    assert.equal(/benutbare\s+mogelijkheden/i.test(result), false);
    assert.match(result, /omdat haar belastbaarheid/i);
  });

  it('removes geen benutbare mogelijkheden edge case', () => {
    const result = stripForbiddenToelichtingPhrases(
      'er geen benutbare mogelijkheden zijn maar werknemer beperkt buitenshuis actief is'
    );
    assert.equal(/benutbare\s+mogelijkheden/i.test(result), false);
    assert.match(result, /buitenshuis actief/i);
  });
});

describe('clampInschalingText', () => {
  it('truncates a long verwachting to max words and sentences', () => {
    const opener = 'Werknemer bevindt zich vermoedelijk in trede 2 van de POW-meter™.';
    const longText =
      `${opener} Eerste extra zin met veel details over re-integratie en urenopbouw binnen spoor 1. Tweede extra zin over activeringsplaatsen en werkervaring. Derde extra zin over netwerkactiviteiten en arbeidsoriëntatie. Vierde extra zin die nooit zou moeten blijven staan in de tabelcel output.`;
    const clamped = clampInschalingText(longText, {
      maxWords: MAX_WORDS_VERWACHTING,
      maxSentences: MAX_SENTENCES_VERWACHTING,
      preserveOpener: VERWACHTING_OPENER,
    });

    assert.ok(hasVerwachtingOpener(clamped));
    assert.ok(countWords(clamped) <= MAX_WORDS_VERWACHTING);
  });

  it('preserves verwachting opener when trimming', () => {
    const longText =
      'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™. ' +
      'Extra zin over urenopbouw. '.repeat(20);
    const clamped = clampInschalingText(longText, {
      maxWords: MAX_WORDS_VERWACHTING,
      maxSentences: MAX_SENTENCES_VERWACHTING,
      preserveOpener: VERWACHTING_OPENER,
    });

    assert.ok(clamped.toLowerCase().startsWith(VERWACHTING_OPENER.toLowerCase()));
  });
});

describe('parsePowMeterContentResult', () => {
  it('coerces trede numbers to 1-6', async () => {
    const { parsePowMeterContentResult, coerceTredeNumber } = await import('../schema');
    assert.equal(coerceTredeNumber(0), 1);
    assert.equal(coerceTredeNumber(9), 6);
    const result = parsePowMeterContentResult({
      huidige_trede_nummer: 3,
      huidige_werkzame_uren: 'test',
      verwachting_trede_nummer: 4,
      verwachting_kern: 'kern',
      toelichting_kern: 'kern',
    });
    assert.equal(result.huidige_trede_nummer, 3);
    assert.equal(result.verwachting_trede_nummer, 4);
  });
});

describe('filterPowMeterDocs', () => {
  it('filters and prioritizes belastbaarheid, ad, intake', async () => {
    const { filterPowMeterDocs, getPowMeterDocCategory } = await import('../generate');
    assert.equal(getPowMeterDocCategory('fml_izp'), 'belastbaarheid');
    assert.equal(getPowMeterDocCategory('ad_rapportage'), 'ad');
    assert.equal(getPowMeterDocCategory('intakeformulier'), 'intake');
    assert.equal(getPowMeterDocCategory('extra'), null);

    const filtered = filterPowMeterDocs([
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
