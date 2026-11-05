import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExWerknemerFromText,
  applyExWerknemerWording,
  applyExWerknemerWordingBeforeMarker,
  detectExWerknemerFromText,
  displayInleidingText,
  intakeTextHasExWerknemerLabel,
  isExWerknemer,
  normalizeExWerknemer,
} from '../ex-werknemer-wording';

describe('normalizeExWerknemer', () => {
  it('returns true only for explicit true-like values', () => {
    assert.equal(normalizeExWerknemer(true), true);
    assert.equal(normalizeExWerknemer('true'), true);
    assert.equal(normalizeExWerknemer(1), true);
    assert.equal(normalizeExWerknemer(false), false);
    assert.equal(normalizeExWerknemer(null), false);
    assert.equal(normalizeExWerknemer(undefined), false);
  });
});

describe('detectExWerknemerFromText', () => {
  it('detects checked Ex-werknemer checkbox', () => {
    assert.equal(detectExWerknemerFromText('☒ Ex-werknemer'), true);
    assert.equal(detectExWerknemerFromText('Ex-werknemer ☑'), true);
    assert.equal(detectExWerknemerFromText('[x] Ex-werknemer'), true);
  });

  it('detects unchecked Ex-werknemer checkbox', () => {
    assert.equal(detectExWerknemerFromText('☐ Ex-werknemer'), false);
    assert.equal(detectExWerknemerFromText('Ex-werknemer ☐'), false);
    assert.equal(detectExWerknemerFromText('[ ] Ex-werknemer'), false);
  });

  it('returns null when label or glyph state is unclear', () => {
    assert.equal(detectExWerknemerFromText(''), null);
    assert.equal(detectExWerknemerFromText('Geen ex-werknemer info'), null);
  });
});

describe('applyExWerknemerFromText', () => {
  it('prefers text detection over model', () => {
    assert.equal(applyExWerknemerFromText(true, false), false);
    assert.equal(applyExWerknemerFromText(false, true), true);
  });

  it('falls back to model true only when text is inconclusive', () => {
    assert.equal(applyExWerknemerFromText(true, null), true);
    assert.equal(applyExWerknemerFromText(false, null), false);
    assert.equal(applyExWerknemerFromText(null, null), false);
  });
});

describe('isExWerknemer', () => {
  it('is true only when flag is explicitly true', () => {
    assert.equal(isExWerknemer({ is_ex_werknemer: true }), true);
    assert.equal(isExWerknemer({ is_ex_werknemer: false }), false);
    assert.equal(isExWerknemer({}), false);
  });
});

describe('applyExWerknemerWording', () => {
  it('leaves text unchanged when the flag is off', () => {
    assert.equal(applyExWerknemerWording('Gegevens werknemer', false), 'Gegevens werknemer');
  });

  it('renames this person and this employer, keeping the original capital', () => {
    assert.equal(applyExWerknemerWording('Gegevens werknemer', true), 'Gegevens ex-werknemer');
    assert.equal(applyExWerknemerWording('Werknemer is een', true), 'Ex-werknemer is een');
    assert.equal(applyExWerknemerWording('Werkgever', true), 'Ex-werkgever');
    assert.equal(applyExWerknemerWording('aan de werkgever', true), 'aan de ex-werkgever');
    assert.equal(applyExWerknemerWording('de werknemers', true), 'de ex-werknemers');
  });

  it('uses the parenthetical form for the generic phrases', () => {
    assert.equal(applyExWerknemerWording('veel werknemers', true), 'veel (ex)werknemers');
    assert.equal(
      applyExWerknemerWording('Een werknemer kan zich dan extra belast voelen', true),
      'Een (ex)werknemer kan zich dan extra belast voelen'
    );
    assert.equal(applyExWerknemerWording('Soms is een werknemer', true), 'Soms is een (ex)werknemer');
    assert.equal(applyExWerknemerWording('Wij helpen werknemers', true), 'Wij helpen (ex)werknemers');
    assert.equal(
      applyExWerknemerWording('voor een werknemer niet mogelijk', true),
      'voor een (ex)werknemer niet mogelijk'
    );
    assert.equal(
      applyExWerknemerWording('de werknemer te begeleiden', true),
      'de (ex)werknemer te begeleiden'
    );
    assert.equal(
      applyExWerknemerWording('wanneer een werknemer moeite heeft', true),
      'wanneer een (ex)werknemer moeite heeft'
    );
    assert.equal(
      applyExWerknemerWording('participatie van werknemers', true),
      'participatie van (ex)werknemers'
    );
    assert.equal(
      applyExWerknemerWording('een werknemer te laten stijgen', true),
      'een (ex)werknemer te laten stijgen'
    );
  });

  it('leaves protected words, existing ex- forms, and quotations unchanged', () => {
    const protectedText = [
      'werknemersvaardigheden',
      'omdat een werknemer kan worden ingezet',
      'nieuwe werkgever',
      'potentiële werkgevers',
      'ex-werknemer',
      '(ex)werknemer',
      'Gegevens opdrachtgever',
    ].join(' ');
    assert.equal(applyExWerknemerWording(protectedText, true), protectedText);
    assert.equal(
      applyExWerknemerWording('Het advies luidt: "de werknemer blijft in dienst".', true),
      'Het advies luidt: "de werknemer blijft in dienst".'
    );
  });
});

describe('displayInleidingText', () => {
  it('drops the readability disclaimer and rewrites the remaining sentences', () => {
    const saved =
      'Werknemer is een 40-jarige vrouw. *Werknemer is uit dienst bij Gom. Omwille van leesbaarheid wordt de term "werknemer" gehanteerd in plaats van "ex-werknemer". Ditzelfde geldt voor "werkgever" en "ex-werkgever".';
    assert.equal(
      displayInleidingText(saved, true),
      'Ex-werknemer is een 40-jarige vrouw.'
    );
  });

  it('keeps the quote after an AD marker literal', () => {
    const text = 'Voor de werknemer staat het volgende: de werknemer hervat het werk.';
    assert.equal(
      applyExWerknemerWordingBeforeMarker(text, true, ['staat het volgende:']),
      'Voor de ex-werknemer staat het volgende: de werknemer hervat het werk.'
    );
  });
});

describe('intakeTextHasExWerknemerLabel', () => {
  it('detects Ex-werknemer label in plain text', () => {
    assert.equal(intakeTextHasExWerknemerLabel('☐ Ex-werknemer'), true);
    assert.equal(intakeTextHasExWerknemerLabel('no label here'), false);
  });
});
