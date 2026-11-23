import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractArtsOrgFromPlainText } from '@/lib/tp/extract-arts-from-plain-text';

describe('extractArtsOrgFromPlainText', () => {
  it('parses Mourad-style FML Naam arts line', () => {
    const fmlTail =
      'Naam artsB Droogleever, Bedrijfsarts, 29020730801\nDatum 12-03-2025';
    const org = extractArtsOrgFromPlainText(fmlTail);
    assert.ok(org);
    assert.match(org!, /Droogleever/i);
    assert.match(org!, /Bedrijfsarts/i);
  });

  it('parses Mourad-style spreekuur signature', () => {
    const spreek =
      'Met vriendelijke groet,\n\nB. Droogleever, bedrijfsarts ,  29020730801\n';
    const org = extractArtsOrgFromPlainText(spreek);
    assert.ok(org);
    assert.match(org!, /Droogleever/i);
    assert.match(org!, /Bedrijfsarts/i);
  });

  it('returns null for empty or unrelated text', () => {
    assert.equal(extractArtsOrgFromPlainText(''), null);
    assert.equal(extractArtsOrgFromPlainText('Alleen belastbaarheid zonder arts.'), null);
  });
});
