import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeTestSummaryText,
  parseTestSummaryRaw,
  personalityBand,
  personalitySourceSide,
  validateTestSummary,
} from '@/lib/vgr/ai/test-summary';

describe('personalityBand / personalitySourceSide', () => {
  it('uses the 0/49/50/51/100 thresholds from the test prompt', () => {
    assert.equal(personalityBand('0'), 'lager');
    assert.equal(personalityBand('49'), 'lager');
    assert.equal(personalityBand('50'), 'gemiddeld');
    assert.equal(personalityBand('51'), 'hoger');
    assert.equal(personalityBand('100'), 'hoger');
    assert.equal(personalityBand('101'), null);
    assert.equal(personalityBand(''), null);

    assert.equal(personalitySourceSide('0'), 'low');
    assert.equal(personalitySourceSide('49'), 'low');
    assert.equal(personalitySourceSide('50'), 'high');
    assert.equal(personalitySourceSide('51'), 'high');
    assert.equal(personalitySourceSide('100'), 'high');
  });
});

describe('validateTestSummary', () => {
  it('preserves exact scores and flags missing scoort-band plus padded occupations', () => {
    const raw = parseTestSummaryRaw({
      tests_present: ['Persoonlijkheidstest'],
      personality: {
        present: true,
        scores: {
          emotionele_stabiliteit: '49',
          extraversie: '50',
          ordelijkheid: '51',
          vriendelijkheid: '0',
          openheid: '100',
        },
        texts: {
          emotionele_stabiliteit: 'Werknemer scoort lager op het gebied van emotionele stabiliteit.',
          extraversie: 'Werknemer scoort gemiddeld op het gebied van extraversie.',
          ordelijkheid: 'Werknemer scoort hoger op het gebied van ordelijkheid.',
          vriendelijkheid: 'Werknemer scoort lager op het gebied van vriendelijkheid.',
          openheid: 'Werknemer zit meer naar rechts op openheid.',
        },
      },
      occupations: ['A', 'B', 'A', ...Array.from({ length: 14 }, (_, i) => `Beroep ${i}`)],
    });
    const issues = validateTestSummary(raw);
    assert.ok(issues.some((i) => /openheid/i.test(i) && /links\/rechts/.test(i)));
    assert.ok(issues.some((i) => /Meer dan 15/.test(i)));
    assert.ok(issues.some((i) => /Dubbele/.test(i)));
    assert.equal(raw.personality.scores.emotionele_stabiliteit, '49');
    assert.equal(raw.personality.scores.openheid, '100');
  });

  it('does not invent occupations when none were supplied', () => {
    const raw = parseTestSummaryRaw({
      tests_present: ['Competentietest'],
      personality: { present: false, scores: {}, texts: {} },
      competentie_text: 'Werknemer scoort het hoogst op samenwerken.',
      occupations: [],
    });
    assert.deepEqual(raw.occupations, []);
    assert.equal(validateTestSummary(raw).length, 0);
    const text = composeTestSummaryText(raw);
    assert.match(text, /competentietest/);
    assert.doesNotMatch(text, /voorbeeldberoepen/);
  });
});
