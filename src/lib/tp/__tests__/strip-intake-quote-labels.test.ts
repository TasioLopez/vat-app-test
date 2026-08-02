import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripLeadingIntakeQuoteLabels } from '../strip-intake-quote-labels';

describe('stripLeadingIntakeQuoteLabels', () => {
  it('strips advies label when space after colon is missing', () => {
    const input =
      'Quote advies spoor 2 (inleiding):Blijf de re-integratiemogelijkheden binnen spoor 1 monitoren.';
    assert.equal(
      stripLeadingIntakeQuoteLabels(input),
      'Blijf de re-integratiemogelijkheden binnen spoor 1 monitoren.'
    );
  });

  it('strips advies label when space after colon is present', () => {
    const input =
      'Quote advies spoor 2 (inleiding): Blijf de re-integratiemogelijkheden binnen spoor 1 monitoren.';
    assert.equal(
      stripLeadingIntakeQuoteLabels(input),
      'Blijf de re-integratiemogelijkheden binnen spoor 1 monitoren.'
    );
  });

  it('strips advies label without (inleiding)', () => {
    const input = 'Quote advies spoor 2:Start een tweede spoortraject.';
    assert.equal(stripLeadingIntakeQuoteLabels(input), 'Start een tweede spoortraject.');
  });

  it('strips duplicated passende functies labels', () => {
    const input =
      'Quote passende functies: Quote passende functies: - toezichthouder parkeergarage\n- enquêteur';
    assert.equal(
      stripLeadingIntakeQuoteLabels(input),
      '- toezichthouder parkeergarage\n- enquêteur'
    );
  });

  it('leaves a clean quote unchanged', () => {
    const input = 'Blijf de re-integratiemogelijkheden binnen spoor 1 monitoren.';
    assert.equal(stripLeadingIntakeQuoteLabels(input), input);
  });

  it('preserves leading bullets after stripping passende functies label', () => {
    const input = `Quote passende functies:- lichte, zittende werkzaamheden
- assemblage medewerker`;
    assert.equal(
      stripLeadingIntakeQuoteLabels(input),
      `- lichte, zittende werkzaamheden
- assemblage medewerker`
    );
  });

  it('returns empty/falsy input as-is', () => {
    assert.equal(stripLeadingIntakeQuoteLabels(''), '');
  });
});
