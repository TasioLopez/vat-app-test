import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPowInschalingBlock,
  buildPowMeterFields,
  clampInschalingText,
  hasVerwachtingOpener,
  parsePowInschaling,
} from '../build-fields';
import {
  INSCHALING_DELIMITER,
  INSCHALING_ROW_LABELS,
  INSCHALING_STYLE_REFERENCE,
  MAX_SENTENCES_VERWACHTING,
  MAX_WORDS_VERWACHTING,
  MAX_WORDS_WERKZAME_UREN,
  VERWACHTING_OPENER,
} from '../constants';
import type { PowMeterContentResult } from '../schema';

const PDF_REFERENCE: PowMeterContentResult = {
  huidige_trede_tekst: 'Werknemer bevindt zich in trede 2 van de POW-meter™.',
  huidige_werkzame_uren: '0,5 uur per week.',
  verwachting_3_maanden:
    'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™. Dit kan worden gerealiseerd door een gefaseerde urenopbouw binnen spoor 1 of door het vinden van een passende activerings- of werkervaringsplaats. Binnen deze setting kan werknemer de belastbaarheid en het aantal uren zorgvuldig opbouwen en toetsen.',
  toelichting_pow:
    'Werknemer bevindt zich ten tijde van de intake in trede 2 van de PoW-meter. Het doel is doorgroei naar trede 3.',
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe('buildPowMeterFields', () => {
  it('builds inschaling delimiter JSON and separate toelichting', () => {
    const { pow_meter, visie_plaatsbaarheid } = buildPowMeterFields(PDF_REFERENCE);

    assert.ok(pow_meter.startsWith(INSCHALING_DELIMITER));
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.match(parsed!.huidige_trede, /trede 2/);
    assert.equal(parsed!.werkzame_uren, '0,5 uur per week.');
    assert.ok(hasVerwachtingOpener(parsed!.verwachting));
    assert.match(visie_plaatsbaarheid, /trede 2/);
    assert.doesNotMatch(visie_plaatsbaarheid, /^•/);
  });

  it('round-trips PDF reference example from style reference', () => {
    assert.ok(INSCHALING_STYLE_REFERENCE.includes('0,5 uur per week.'));
    const { pow_meter } = buildPowMeterFields(PDF_REFERENCE);
    const parsed = parsePowInschaling(pow_meter);
    assert.equal(parsed!.werkzame_uren, PDF_REFERENCE.huidige_werkzame_uren);
    assert.equal(parsed!.verwachting, PDF_REFERENCE.verwachting_3_maanden);
  });

  it('clamps overlong werkzame uren and verwachting from model output', () => {
    const longContent: PowMeterContentResult = {
      huidige_trede_tekst: 'Werknemer bevindt zich in trede 1 van de POW-meter™.',
      huidige_werkzame_uren:
        'Werknemer verricht momenteel geen arbeid bij de voormalige eigen werkgever of elders en is volledig arbeidsongeschikt gemeld met een traject dat gericht is op herstel en geleidelijke opbouw van activiteiten en belastbaarheid in de komende periode.',
      verwachting_3_maanden:
        'Werknemer bevindt zich vermoedelijk in trede 2 van de POW-meter™. Binnen drie maanden wordt verwacht dat werknemer kan deelnemen aan lichte activiteiten buitenshuis. Daarnaast kunnen binnen het tweede spoor arbeidsoriëntatie, netwerkactiviteiten, een werkervaringsplaats, stage of andere passende activiteiten worden ingezet om de mogelijkheden richting passend werk verder te verkennen. Wanneer hieruit een beter passende en haalbare werksetting naar voren komt, kan werknemer ook binnen deze context verder werken aan het opbouwen en toetsen van de belastbaarheid. Dit sluit aan bij de intake en het huidige herstelperspectief.',
      toelichting_pow: 'Lange toelichting die niet ingekort mag worden in dit testgeval.',
    };

    const { pow_meter } = buildPowMeterFields(longContent);
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.ok(countWords(parsed!.werkzame_uren) <= MAX_WORDS_WERKZAME_UREN);
    assert.ok(countWords(parsed!.verwachting) <= MAX_WORDS_VERWACHTING);
    assert.ok(hasVerwachtingOpener(parsed!.verwachting));
  });

  it('parsePowInschaling round-trips buildPowInschalingBlock', () => {
    const block = buildPowInschalingBlock({
      huidige_trede: 'Trede 1',
      werkzame_uren: 'Geen uren',
      verwachting: 'Werknemer bevindt zich vermoedelijk in trede 2 van de POW-meter™.',
    });
    const parsed = parsePowInschaling(block);
    assert.deepEqual(parsed, {
      huidige_trede: 'Trede 1',
      werkzame_uren: 'Geen uren',
      verwachting: 'Werknemer bevindt zich vermoedelijk in trede 2 van de POW-meter™.',
    });
  });

  it('exposes expected table row labels', () => {
    assert.equal(INSCHALING_ROW_LABELS.huidige_trede, 'Huidige trede POW-meter™');
    assert.equal(INSCHALING_ROW_LABELS.werkzame_uren, 'Huidige werkzame uren');
    assert.equal(INSCHALING_ROW_LABELS.verwachting, 'Verwachting over 3 maanden');
  });
});

describe('clampInschalingText', () => {
  it('truncates a long verwachting to max words and sentences', () => {
    const longText =
      'Werknemer bevindt zich vermoedelijk in trede 2 van de POW-meter™. Eerste extra zin met veel details over re-integratie en urenopbouw binnen spoor 1. Tweede extra zin over activeringsplaatsen en werkervaring. Derde extra zin over netwerkactiviteiten en arbeidsoriëntatie. Vierde extra zin die nooit zou moeten blijven staan in de tabelcel output.';
    const clamped = clampInschalingText(longText, {
      maxWords: MAX_WORDS_VERWACHTING,
      maxSentences: MAX_SENTENCES_VERWACHTING,
      preserveOpener: VERWACHTING_OPENER,
    });

    assert.ok(hasVerwachtingOpener(clamped));
    assert.ok(countWords(clamped) <= MAX_WORDS_VERWACHTING);
    assert.ok(clamped.split(/(?<=[.!?])\s+/).length <= MAX_SENTENCES_VERWACHTING);
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
