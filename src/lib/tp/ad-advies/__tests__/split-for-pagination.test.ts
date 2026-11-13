import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADVIES_DELIMITER } from '../constants';
import { buildAdAdviesBlock } from '../build-fields';
import {
  expandAdAdviesByFunctie,
  mergeAdAdviesFragments,
  splitAdAdviesInsideCitaat,
} from '../split-for-pagination';

const INTRO =
  'In het arbeidsdeskundigrapport, opgesteld door A. Landewer, op 21 oktober 2026 staat het volgende advies over passende arbeid:';

const FUNCTIE_1 =
  '1. Receptionist Korte taakomschrijving: de functie bestaat uit het ontvangen van bezoekers, telefonie en lichte administratieve ondersteuning.';
const FUNCTIE_2 =
  '2. Administratief medewerker Korte taakomschrijving: de functie bestaat uit het verwerken van gegevens, archiveren van documenten en beperkt telefonisch contact.';
const FUNCTIE_3 =
  '3. Baliemedewerker Korte taakomschrijving: de functie bestaat uit contact met bezoekers, korte administratieve handelingen en het afwisselen van zitten en staan.';

function adviesWithFuncties(): string {
  return buildAdAdviesBlock(INTRO, [FUNCTIE_1, FUNCTIE_2, FUNCTIE_3].join('\n\n'));
}

describe('expandAdAdviesByFunctie', () => {
  it('splits three functies and keeps the delimiter and quote marks', () => {
    const parts = expandAdAdviesByFunctie(adviesWithFuncties());
    assert.ok(parts);
    assert.equal(parts.length, 3);
    assert.deepEqual(
      parts.map((part) => part.quoteMarks),
      ['open', 'none', 'close']
    );

    assert.match(parts[0].md, new RegExp(INTRO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(parts[0].md, /1\. Receptionist/);
    assert.doesNotMatch(parts[0].md, /2\. Administratief/);

    assert.equal(parts[1].md.startsWith(`${ADVIES_DELIMITER}\n`), true);
    assert.match(parts[1].md, /2\. Administratief/);
    assert.doesNotMatch(parts[1].md, /opgesteld door/);

    assert.match(parts[2].md, /3\. Baliemedewerker/);
    for (const part of parts) {
      assert.equal(part.md.split(ADVIES_DELIMITER).length, 2);
    }
  });

  it('does not give an open parent a closing mark, or a close parent an opening mark', () => {
    const openParts = expandAdAdviesByFunctie(adviesWithFuncties(), 'open');
    assert.ok(openParts);
    assert.deepEqual(
      openParts.map((part) => part.quoteMarks),
      ['open', 'none', 'none']
    );

    const closeParts = expandAdAdviesByFunctie(adviesWithFuncties(), 'close');
    assert.ok(closeParts);
    assert.deepEqual(
      closeParts.map((part) => part.quoteMarks),
      ['none', 'none', 'close']
    );
  });

  it('does not expand a one-page advies that is a single block', () => {
    const md = buildAdAdviesBlock(
      INTRO,
      'Eén doorlopende alinea zonder blanco regel of genummerde functies, zoals een kort advies dat op één pagina past.'
    );
    assert.equal(expandAdAdviesByFunctie(md), null);
  });
});

describe('mergeAdAdviesFragments', () => {
  it('restores one block with both marks and a single delimiter', () => {
    const parts = expandAdAdviesByFunctie(adviesWithFuncties());
    assert.ok(parts);
    const merged = mergeAdAdviesFragments(mergeAdAdviesFragments(parts[0], parts[1]), parts[2]);

    assert.equal(merged.quoteMarks, 'both');
    assert.equal(merged.md.split(ADVIES_DELIMITER).length, 2);
    assert.match(merged.md, /1\. Receptionist/);
    assert.match(merged.md, /2\. Administratief/);
    assert.match(merged.md, /3\. Baliemedewerker/);
    assert.match(merged.md, /opgesteld door A\. Landewer/);
  });

  it('merging the last two functies keeps the closing mark only', () => {
    const parts = expandAdAdviesByFunctie(adviesWithFuncties());
    assert.ok(parts);
    const tail = mergeAdAdviesFragments(parts[1], parts[2]);

    assert.equal(tail.quoteMarks, 'close');
    assert.equal(tail.md.split(ADVIES_DELIMITER).length, 2);
    assert.match(tail.md, /2\. Administratief/);
    assert.match(tail.md, /3\. Baliemedewerker/);
    assert.doesNotMatch(tail.md, /1\. Receptionist/);
    assert.equal(tail.md.startsWith(`${ADVIES_DELIMITER}\n`), true);
  });
});

describe('splitAdAdviesInsideCitaat', () => {
  it('splits an oversized functie inside the citaat and keeps both pieces as advies', () => {
    const functie = [
      'De receptionist ontvangt bezoekers en beantwoordt de telefoon gedurende de hele ochtend.',
      'Daarnaast verwerkt deze medewerker lichte administratie en wisselt zitten af met kort lopen.',
    ].join(' ');
    const md = buildAdAdviesBlock(INTRO, functie);
    assert.equal(expandAdAdviesByFunctie(md), null);

    const parts = splitAdAdviesInsideCitaat(md);
    assert.ok(parts);
    assert.equal(parts[0].quoteMarks, 'open');
    assert.equal(parts[1].quoteMarks, 'close');
    assert.match(parts[0].md, /opgesteld door A\. Landewer/);
    assert.match(parts[0].md, /ontvangt bezoekers/);
    assert.doesNotMatch(parts[0].md, /lichte administratie/);
    assert.equal(parts[1].md.startsWith(`${ADVIES_DELIMITER}\n`), true);
    assert.match(parts[1].md, /lichte administratie/);
    assert.equal(parts[0].md.split(ADVIES_DELIMITER).length, 2);
    assert.equal(parts[1].md.split(ADVIES_DELIMITER).length, 2);
  });

  it('falls back to a word split when the functie has no sentence boundary', () => {
    const blob = Array.from({ length: 24 }, (_, index) => `woord${index}`).join(' ');
    const parts = splitAdAdviesInsideCitaat(buildAdAdviesBlock(INTRO, blob));
    assert.ok(parts);
    assert.equal(parts[0].md.split(ADVIES_DELIMITER).length, 2);
    assert.equal(parts[1].md.split(ADVIES_DELIMITER).length, 2);
    assert.match(parts[0].md, /woord0/);
    assert.match(parts[1].md, /woord23/);
    assert.doesNotMatch(parts[0].md, /woord23/);
  });
});
