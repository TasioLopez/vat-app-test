import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPowInschalingBlock,
  buildPowMeterFields,
  hasVerwachtingOpener,
  parsePowInschaling,
} from '../build-fields';
import { INSCHALING_DELIMITER, INSCHALING_ROW_LABELS } from '../constants';
import type { PowMeterContentResult } from '../schema';

describe('buildPowMeterFields', () => {
  it('builds inschaling delimiter JSON and separate toelichting', () => {
    const content: PowMeterContentResult = {
      huidige_trede_tekst: 'Werknemer bevindt zich in trede 2 van de POW-meter™.',
      huidige_werkzame_uren: '0,5 uur per week.',
      verwachting_3_maanden:
        'Werknemer bevindt zich vermoedelijk in trede 3 van de POW-meter™. Dit kan worden gerealiseerd door een gefaseerde urenopbouw.',
      toelichting_pow:
        'Werknemer bevindt zich ten tijde van de intake in trede 2 van de PoW-meter. Het doel is doorgroei naar trede 3.',
    };

    const { pow_meter, visie_plaatsbaarheid } = buildPowMeterFields(content);

    assert.ok(pow_meter.startsWith(INSCHALING_DELIMITER));
    const parsed = parsePowInschaling(pow_meter);
    assert.ok(parsed);
    assert.match(parsed!.huidige_trede, /trede 2/);
    assert.equal(parsed!.werkzame_uren, '0,5 uur per week.');
    assert.ok(hasVerwachtingOpener(parsed!.verwachting));
    assert.match(visie_plaatsbaarheid, /trede 2/);
    assert.doesNotMatch(visie_plaatsbaarheid, /^•/);
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
