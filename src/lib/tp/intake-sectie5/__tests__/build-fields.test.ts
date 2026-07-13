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
    });
    assert.equal(content.quote_prognose_advies_belastbaarheid, KELLY_QUOTE);
  });

  it('coerces empty string to null', () => {
    const content = parseIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: '   ',
    });
    assert.equal(content.quote_prognose_advies_belastbaarheid, null);
  });
});

describe('hasIntakeSectie5PrognoseQuote', () => {
  it('detects non-empty quote', () => {
    const content = sanitizeIntakeSectie5Content({
      quote_prognose_advies_belastbaarheid: KELLY_QUOTE,
    });
    assert.ok(hasIntakeSectie5PrognoseQuote(content));
  });

  it('returns false for null quote', () => {
    assert.ok(!hasIntakeSectie5PrognoseQuote({ quote_prognose_advies_belastbaarheid: null }));
  });
});
