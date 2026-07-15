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
  truncateToWordLimitOnSentenceBoundary,
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
import { ladderYesThrough } from '../ladder';
import type { PowMeterFacts } from '../facts';
import type { PowMeterContentResult } from '../schema';

const defaultFacts: PowMeterFacts = {
  current_work_hours_per_week: 0.5,
  fml_max_hours_per_week: 10,
  awaiting_revalidation_or_intensive_treatment: false,
  explicitly_not_loadable_at_intake: false,
  inactivity_or_limited_daily_structure: false,
  outside_deliberate_min_2_per_week: true,
  outside_functional_only: false,
  regular_social_participation_outside: false,
  motivated_toward_work: true,
  performs_work_activities: true,
  paid_work: false,
  duurzaam_passend_min_65: false,
};

/** Ladder stops at Q2 Ja / Q3 Nee → trede 2. */
const ladderTrede2 = {
  ...ladderYesThrough(2),
  q3_regelmatige_sociale_participatie: false,
};

const baseContent: PowMeterContentResult = {
  huidige_trede_nummer: 2,
  ladder: ladderTrede2,
  facts: defaultFacts,
  huidige_werkzame_uren:
    'Werknemer werkt momenteel 0,5 uur per week. Zij verricht geen betaald werk.',
  verwachting_trede_nummer: 3,
  verwachting_includes_spoor2_block: false,
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

  it('capitalizes mid-sentence verwachting kern starting with de', () => {
    const assembled = assemblePowMeterContent({
      ...baseContent,
      verwachting_kern: 'de belastbaarheid laag is en de urenopbouw zeer geleidelijk moet verlopen.',
    });
    assert.match(
      assembled.verwachting_3_maanden,
      /^Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™\. De belastbaarheid/
    );
    assert.doesNotMatch(assembled.verwachting_3_maanden, /POW-meter™,\s*de/i);
  });

  it('strips leaked opener with comma join without double debris', () => {
    const assembled = assemblePowMeterContent({
      ...baseContent,
      verwachting_kern:
        'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™, de belastbaarheid laag is en opbouw geleidelijk verloopt.',
    });
    assert.match(
      assembled.verwachting_3_maanden,
      /^Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™\. De belastbaarheid/
    );
    assert.equal((assembled.verwachting_3_maanden.match(/POW-meter™/g) || []).length, 1);
  });

  it('includes Spoor 2 block in verwachting when flag is set (server injection)', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      verwachting_includes_spoor2_block: true,
      verwachting_kern: 'Verwachte groei via spoor 1 in de komende periode.',
    };
    const { pow_meter } = buildPowMeterFields(content);
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed!.verwachting.includes('binnen het tweede spoor arbeidsoriëntatie'));
    assert.ok(parsed!.verwachting.endsWith('belastbaarheid.'));
  });

  it('Hulstaart-style trede 1 uses trede 1 toelichting opener', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      huidige_trede_nummer: 1,
      ladder: { ...ladderYesThrough(1) },
      facts: {
        ...defaultFacts,
        current_work_hours_per_week: 0,
        awaiting_revalidation_or_intensive_treatment: true,
        explicitly_not_loadable_at_intake: true,
        inactivity_or_limited_daily_structure: true,
        outside_functional_only: true,
        outside_deliberate_min_2_per_week: false,
        performs_work_activities: false,
      },
      toelichting_kern:
        'werknemer nog niet belastbaar is en 0 uur per week werkt, terwijl revalidatie centraal staat.',
    };
    const { pow_meter } = buildPowMeterFields(content);
    const toelichting = parsePowToelichting(pow_meter);
    assert.ok(hasToelichtingOpener(toelichting, 1));
    assert.match(toelichting, /trede 1/);
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

  it('heals orphan "omdat is voor zorg" after strip', () => {
    const result = stripForbiddenToelichtingPhrases(
      'Werknemer bevindt zich tijdens de intake in trede 2 van de POW-meter™ omdat is voor zorg voor haar kind en huishoudelijke taken.'
    );
    assert.doesNotMatch(result, /omdat is voor/i);
    assert.match(result, /omdat voor zorg|omdat zorg/i);
  });
});

describe('truncateToWordLimitOnSentenceBoundary', () => {
  it('drops incomplete last sentence instead of mid-clause cut', () => {
    const opener = 'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™.';
    const body =
      'In de komende drie maanden zal vooral het revalidatietraject centraal staan. ' +
      'Geen structurele urenopbouw in werk wordt verwacht ondanks eerdere plannen.';
    const longText = `${opener} ${body}`;
    const clamped = truncateToWordLimitOnSentenceBoundary(longText, 20);
    assert.ok(countWords(clamped) <= 20);
    assert.match(clamped, /\.$/);
    assert.doesNotMatch(clamped, /\bnaar$/);
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
  it('computes huidige trede from ladder and ignores model huidige_trede_nummer', async () => {
    const { parsePowMeterContentResult, coerceTredeNumber } = await import('../schema');
    assert.equal(coerceTredeNumber(0), 1);
    assert.equal(coerceTredeNumber(9), 6);

    const result = parsePowMeterContentResult({
      current_work_hours_per_week: 0,
      fml_max_hours_per_week: 10,
      awaiting_revalidation_or_intensive_treatment: false,
      explicitly_not_loadable_at_intake: false,
      inactivity_or_limited_daily_structure: false,
      outside_deliberate_min_2_per_week: true,
      outside_functional_only: false,
      regular_social_participation_outside: true,
      motivated_toward_work: true,
      performs_work_activities: true,
      paid_work: true,
      duurzaam_passend_min_65: true,
      q1_duurzaam_benutbare_mogelijkheden: true,
      q2_minimaal_2x_buitenshuis: true,
      q3_regelmatige_sociale_participatie: true,
      q4_gemotiveerd_richting_arbeid: true,
      q5_belastbaar_min_12u: false,
      q6_verricht_werkzaamheden: true,
      q7_betaald_werk: true,
      q7_duurzaam_passend_min_65: true,
      huidige_trede_nummer: 6,
      huidige_werkzame_uren: 'test',
      verwachting_trede_nummer: 4,
      verwachting_includes_spoor2_block: false,
      verwachting_kern: 'Kern body.',
      toelichting_kern: 'kern',
    });
    // Q5 Nee → trede 3; model said 6 is ignored
    assert.equal(result.huidige_trede_nummer, 3);
    assert.equal(result.verwachting_trede_nummer, 4);
    assert.equal(result.ladder.q5_belastbaar_min_12u, false);
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
