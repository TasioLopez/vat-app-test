import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasIntakeSectie5PrognoseQuote, sanitizeIntakeSectie5Content } from '../build-fields';
import { parseIntakeSectie5Content } from '../schema';

const KELLY_QUOTE =
  'Er zijn benutbare mogelijkheden. Terugkeer in eigen werk is onzeker maar niet uitgesloten. Belastbaarheid kan verder verbeteren. Arbeidsdeskundig onderzoek noodzakelijk.';

describe('parseIntakeSectie5Content', () => {
  it('parses quote_prognose_advies_belastbaarheid', () => {
    const content = parseIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: KELLY_QUOTE,
      rubrieken: [],
    });
    assert.equal(content.quote_prognose_advies_belastbaarheid, KELLY_QUOTE);
    assert.deepEqual(content.rubrieken, []);
  });

  it('coerces empty string to null', () => {
    const content = parseIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: '   ',
      rubrieken: [],
    });
    assert.equal(content.quote_prognose_advies_belastbaarheid, null);
  });

  it('normalizes Habib-style checked FML rubrieken including intake aliases', () => {
    const content = parseIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: KELLY_QUOTE,
      rubrieken: [
        'Persoonlijk functioneren',
        'Sociaal Functioneren',
        'Dynamische handelingen',
        'Aanpassingen fysieke omgevingseisen',
        'Werktijden',
        'Werktijden',
      ],
    });
    assert.deepEqual(content.rubrieken, [
      'Persoonlijk functioneren',
      'Sociaal functioneren',
      'Dynamische handelingen',
      'Aanpassing aan fysieke omgevingseisen',
      'Werktijden',
    ]);
  });

  it('defaults missing rubrieken to empty array', () => {
    const content = parseIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: KELLY_QUOTE,
    });
    assert.deepEqual(content.rubrieken, []);
  });
});

describe('hasIntakeSectie5PrognoseQuote', () => {
  it('detects non-empty quote', () => {
    const content = sanitizeIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: KELLY_QUOTE,
      rubrieken: ['Werktijden'],
    });
    assert.ok(hasIntakeSectie5PrognoseQuote(content));
    assert.deepEqual(content.rubrieken, ['Werktijden']);
  });

  it('returns false for null quote', () => {
    assert.ok(
      !hasIntakeSectie5PrognoseQuote({ quote_prognose_advies_belastbaarheid: null, rubrieken: [] })
    );
  });
});
