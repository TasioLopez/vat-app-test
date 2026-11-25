import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExToPowInschalingLeaves,
  applyExWerknemerFromText,
  applyExWerknemerWording,
  applyExWerknemerWordingBeforeMarker,
  basisFieldUsesExWording,
  detectExWerknemerFromText,
  displayInleidingText,
  EX_WERKNEMER_GENERATION_RULE,
  EX_WORDING_FIELD_KEYS,
  EX_WORDING_PREVIEW_ATOM_KEYS,
  intakeTextHasExWerknemerLabel,
  isExWerknemer,
  normalizeExWerknemer,
  previewAtomUsesExWording,
  stripExFromPowInschalingLeaves,
  stripExWerknemerDisplayWording,
} from '../ex-werknemer-wording';
import {
  TP2026_PROFIEL_PREVIEW_META,
  TP2026_PROFIEL_WERKNEMER_FIELD_ORDER,
} from '@/lib/tp2026/basis-profiel-field-order';

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
    assert.equal(detectExWerknemerFromText('■ Ex-werknemer'), true);
    assert.equal(detectExWerknemerFromText('x Ex-werknemer'), true);
    assert.equal(detectExWerknemerFromText('Ex-werknemer: ja'), true);
  });

  it('detects unchecked Ex-werknemer checkbox', () => {
    assert.equal(detectExWerknemerFromText('☐ Ex-werknemer'), false);
    assert.equal(detectExWerknemerFromText('Ex-werknemer ☐'), false);
    assert.equal(detectExWerknemerFromText('[ ] Ex-werknemer'), false);
    assert.equal(detectExWerknemerFromText('Ex-werknemer: nee'), false);
  });

  it('returns null when label or glyph state is unclear', () => {
    assert.equal(detectExWerknemerFromText(''), null);
    assert.equal(detectExWerknemerFromText('Geen ex-werknemer info'), null);
    assert.equal(detectExWerknemerFromText('Ex-werknemer'), null);
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

  it('rewrites the remaining document sentences and gegevens labels', () => {
    assert.equal(
      applyExWerknemerWording(
        'Werknemer heeft uitleg en informatie gekregen over onderstaande punten:',
        true
      ),
      'Ex-werknemer heeft uitleg en informatie gekregen over onderstaande punten:'
    );
    assert.equal(
      applyExWerknemerWording(
        'Werknemer heeft, in overeenstemming met het Inzetbaarheidsprofiel (IZP) van 22 september 2026, beperkingen in de volgende rubrieken:',
        true
      ),
      'Ex-werknemer heeft, in overeenstemming met het Inzetbaarheidsprofiel (IZP) van 22 september 2026, beperkingen in de volgende rubrieken:'
    );
    assert.equal(
      applyExWerknemerWording(
        'Uw cv kan worden gebruikt worden om u te introduceren bij andere werkgevers.',
        true
      ),
      'Uw cv kan worden gebruikt worden om u te introduceren bij andere werkgevers.'
    );
    assert.equal(
      applyExWerknemerWording('bestemd voor uw werkgever en het UWV', true),
      'bestemd voor uw ex-werkgever en het UWV'
    );
    assert.equal(applyExWerknemerWording('Telefoon werknemer', true), 'Telefoon ex-werknemer');
    assert.equal(applyExWerknemerWording('E-mail werknemer', true), 'E-mail ex-werknemer');
    assert.equal(applyExWerknemerWording('Andere werkgever(s)', true), 'Andere werkgever(s)');
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

describe('store-normal Ex wording', () => {
  it('generation rule tells the model to store werknemer not ex-', () => {
    assert.match(EX_WERKNEMER_GENERATION_RULE, /schrijf toch gewoon "werknemer"/i);
    assert.doesNotMatch(EX_WERKNEMER_GENERATION_RULE, /schrijf "ex-werknemer"/i);
  });

  it('editor display equals preview transform for the same stored paragraph', () => {
    const stored = 'Werknemer is een 40-jarige vrouw. De werkgever begeleidt de werknemer.';
    const preview = applyExWerknemerWording(stored, true);
    const editor = displayInleidingText(stored, true);
    assert.equal(editor, preview);
    assert.match(preview, /Ex-werknemer/);
    assert.equal(applyExWerknemerWording(stored, false), stored);
    assert.doesNotMatch(stripExWerknemerDisplayWording(preview), /\bex-/i);
  });
});

describe('shared Ex wording registry', () => {
  it('includes every profiel field including sociale_achtergrond (opt-out empty)', () => {
    assert.equal(basisFieldUsesExWording('sociale_achtergrond'), true);
    assert.equal(basisFieldUsesExWording('pow_meter'), true);
    assert.equal(basisFieldUsesExWording('inleiding'), true);
    for (const key of TP2026_PROFIEL_WERKNEMER_FIELD_ORDER) {
      assert.equal(EX_WORDING_FIELD_KEYS.has(key), true, `missing field ${key}`);
      assert.equal(basisFieldUsesExWording(key), true, `opt-out blocked ${key}`);
    }
  });

  it('preview atom keys cover sociale (soc) and exclude pow blob key', () => {
    assert.equal(previewAtomUsesExWording('soc'), true);
    assert.equal(previewAtomUsesExWording('pow-toelichting'), true);
    assert.equal(previewAtomUsesExWording('pow'), false);
    assert.equal(previewAtomUsesExWording('pow-inschaling'), false);
    assert.equal(EX_WORDING_PREVIEW_ATOM_KEYS.has('soc'), true);
    for (const key of TP2026_PROFIEL_WERKNEMER_FIELD_ORDER) {
      const previewKey = TP2026_PROFIEL_PREVIEW_META[key].previewKey;
      if (previewKey === 'pow') continue;
      assert.equal(
        previewAtomUsesExWording(previewKey),
        true,
        `preview missing ${key}→${previewKey}`
      );
    }
  });

  it('Kedzierska-shaped sociale line matches editor and preview transform', () => {
    const stored = 'Werknemer huurt een kamer en deelt de woning met medebewoners.';
    const display = applyExWerknemerWording(stored, true);
    assert.equal(display, 'Ex-werknemer huurt een kamer en deelt de woning met medebewoners.');
    assert.equal(basisFieldUsesExWording('sociale_achtergrond'), true);
  });
});

describe('POW leaf Ex wording', () => {
  it('applies and strips per cell so JSON quotes cannot block Ex-', () => {
    const cells = {
      huidige_trede: 'Werknemer zit op trede 2.',
      werkzame_uren: 'De werknemer werkt 20 uur.',
      verwachting: 'Werkgever verwacht herstel.',
    };
    const shown = applyExToPowInschalingLeaves(cells, true);
    assert.equal(shown.huidige_trede, 'Ex-werknemer zit op trede 2.');
    assert.equal(shown.werkzame_uren, 'De ex-werknemer werkt 20 uur.');
    assert.equal(shown.verwachting, 'Ex-werkgever verwacht herstel.');
    assert.deepEqual(stripExFromPowInschalingLeaves(shown), cells);
    assert.deepEqual(applyExToPowInschalingLeaves(cells, false), cells);
  });
});
