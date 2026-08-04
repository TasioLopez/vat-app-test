import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assemblePowMeterContent,
  buildHuidigeTredeText,
  buildPowMeterFields,
  buildVerwachtingOpenerSentence,
  buildWerkzameUrenText,
  hasToelichtingOpener,
  hasVerwachtingOpener,
  buildPowMeterStorage,
  parsePowInschaling,
  parsePowToelichting,
  updatePowMeterToelichting,
} from '../build-fields';
import {
  CONTROLEPUNT_LABEL,
  INSCHALING_DELIMITER,
  TOELICHTING_POW_DELIMITER,
  WERKZAME_UREN_EMPTY,
} from '../constants';
import type { PowMeterContentResult } from '../schema';

const sampleVisie =
  'Werknemer bevindt zich tijdens het intakegesprek in trede 2 van de POW-meter™, omdat hij op dit moment helpt thuis met kleine huishoudelijke activiteiten, probeert regelmatig te wandelen, afspraken bijwoont en sociaal contact onderhoudt. Het doel is dat werknemer binnen drie maanden doorgroeit naar trede 3 van de POW-meter™ door starten met activeringswerkzaamheden. Hiermee kan werknemer arbeidsritme opdoen en kunnen de uren en belastbaarheid geleidelijk worden opgebouwd en in de praktijk worden getoetst.';

const baseContent: PowMeterContentResult = {
  huidige_trede_nummer: 2,
  has_werkzame_uren: false,
  huidige_werkzame_uren: '',
  verwachting_trede_nummer: 3,
  visie_op_plaatsbaarheid: sampleVisie,
  controlepunt: '',
};

describe('buildPowMeterFields V11', () => {
  it('assembles exact huidige-trede sentence and empty werkuren', () => {
    const { pow_meter } = buildPowMeterFields(baseContent);

    assert.ok(pow_meter.startsWith(INSCHALING_DELIMITER));
    assert.ok(pow_meter.includes(TOELICHTING_POW_DELIMITER));
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.equal(parsed!.huidige_trede, buildHuidigeTredeText(2));
    assert.equal(parsed!.werkzame_uren, WERKZAME_UREN_EMPTY);
    assert.equal(parsed!.verwachting, buildVerwachtingOpenerSentence(3));
    assert.ok(hasVerwachtingOpener(parsed!.verwachting));
    assert.match(parsed!.verwachting, /over drie maanden/);
    assert.equal(parsed!.verwachting.split(/(?<=[.!?])\s+/).length, 1);

    const toelichting = parsePowToelichting(pow_meter);
    assert.ok(hasToelichtingOpener(toelichting, 2));
    assert.match(toelichting, /intakegesprek/);
    assert.match(toelichting, /doorgroeit naar trede 3/);
    assert.doesNotMatch(toelichting, /Controlepunt/);
  });

  it('keeps model werkzame uren when has_werkzame_uren is true', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      huidige_trede_nummer: 4,
      has_werkzame_uren: true,
      huidige_werkzame_uren:
        'Werknemer verricht momenteel 12 uur per week aan aangepast werk binnen spoor 1.',
      verwachting_trede_nummer: 5,
      visie_op_plaatsbaarheid:
        'Werknemer bevindt zich tijdens het intakegesprek in trede 4 van de POW-meter™, omdat zij op dit moment 12 uur per week aangepast werk verricht binnen spoor 1. Het doel is dat werknemer binnen drie maanden doorgroeit naar trede 5 van de POW-meter™ door onderzoeken of hervatten van betaald werk. Hiermee kan werknemer arbeidsritme opdoen en kunnen de uren en belastbaarheid geleidelijk worden opgebouwd en in de praktijk worden getoetst.',
    };

    const { pow_meter } = buildPowMeterFields(content);
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.match(parsed!.werkzame_uren, /12 uur per week/);
    assert.doesNotMatch(parsed!.werkzame_uren, /geen werkzame uren/);
    assert.equal(parsed!.verwachting, buildVerwachtingOpenerSentence(5));
  });

  it('forces empty werkuren sentence when has_werkzame_uren is false even if model text present', () => {
    assert.equal(
      buildWerkzameUrenText(false, 'Werknemer verricht momenteel 0 uur per week.'),
      WERKZAME_UREN_EMPTY
    );
  });

  it('appends Controlepunt after visie when set', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      controlepunt: 'Is er sprake van een herstelmelding in spoor 1?',
    };

    const { pow_meter } = buildPowMeterFields(content);
    const toelichting = parsePowToelichting(pow_meter);
    assert.ok(toelichting.includes(CONTROLEPUNT_LABEL));
    assert.match(toelichting, /herstelmelding/);
    assert.ok(toelichting.indexOf(CONTROLEPUNT_LABEL) > toelichting.indexOf('intakegesprek'));
  });

  it('verwachting is only the one-liner — no extra kern or Spoor 2 block', () => {
    const assembled = assemblePowMeterContent(baseContent);
    assert.equal(assembled.verwachting_3_maanden, buildVerwachtingOpenerSentence(3));
    assert.doesNotMatch(assembled.verwachting_3_maanden, /Daarnaast kunnen binnen het tweede spoor/);
    assert.doesNotMatch(assembled.verwachting_3_maanden, /gefaserde/);
  });

  it('strips leaked section headers and forbidden jargon from visie', () => {
    const content: PowMeterContentResult = {
      ...baseContent,
      visie_op_plaatsbaarheid:
        'Visie op plaatsbaarheid\nWerknemer bevindt zich tijdens het intakegesprek in trede 2 van de POW-meter™, omdat werknemer wel benutbare mogelijkheden heeft maar beperkt buitenshuis actief is. Het doel is dat werknemer binnen drie maanden doorgroeit naar trede 3 van de POW-meter™ door starten met activeringswerkzaamheden. Hiermee kan werknemer arbeidsritme opdoen.',
    };

    const { pow_meter } = buildPowMeterFields(content);
    const toelichting = parsePowToelichting(pow_meter);
    assert.doesNotMatch(toelichting, /^Visie op plaatsbaarheid/i);
    assert.doesNotMatch(toelichting, /benutbare mogelijkheden/);
  });

  it('round-trips storage and updatePowMeterToelichting', () => {
    const inschaling = {
      huidige_trede: buildHuidigeTredeText(2),
      werkzame_uren: WERKZAME_UREN_EMPTY,
      verwachting: buildVerwachtingOpenerSentence(3),
    };
    const stored = buildPowMeterStorage(inschaling, sampleVisie);
    assert.equal(parsePowToelichting(stored), sampleVisie);
    const updated = updatePowMeterToelichting(stored, `${sampleVisie} Extra.`);
    assert.match(parsePowToelichting(updated), /Extra\./);
  });
});

describe('parsePowMeterContentResult V11', () => {
  it('parses model payload and caps verwachting to +1', async () => {
    const { parsePowMeterContentResult, capVerwachtingTrede } = await import('../schema');

    assert.equal(capVerwachtingTrede(2, 5), 3);
    assert.equal(capVerwachtingTrede(3, 6), 4);
    assert.equal(capVerwachtingTrede(4, 4), 4);
    assert.equal(capVerwachtingTrede(3, 2), 3);

    const result = parsePowMeterContentResult({
      huidige_trede_nummer: 2,
      has_werkzame_uren: false,
      huidige_werkzame_uren: 'should be cleared',
      verwachting_trede_nummer: 5,
      visie_op_plaatsbaarheid: sampleVisie,
      controlepunt: 'Klopt het aantal actieve uren?',
    });

    assert.equal(result.huidige_trede_nummer, 2);
    assert.equal(result.has_werkzame_uren, false);
    assert.equal(result.huidige_werkzame_uren, '');
    assert.equal(result.verwachting_trede_nummer, 3);
    assert.equal(result.controlepunt, 'Klopt het aantal actieve uren?');
  });
});
