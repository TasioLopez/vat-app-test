import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isLogoBulletLine,
  normalizeLimitationsListMarkers,
  splitAfterRubrieken,
  splitBeforeRubrieken,
  stripLogoBulletPrefix,
} from '@/lib/tp/belastbaarheidsprofiel/list-markers';

describe('list-markers', () => {
  it('detects • - * and checkmark bullet lines', () => {
    assert.equal(isLogoBulletLine('• Aanpassing'), true);
    assert.equal(isLogoBulletLine('- Dynamische handelingen'), true);
    assert.equal(isLogoBulletLine('* Statische houdingen'), true);
    assert.equal(isLogoBulletLine('☑ Werktijden'), true);
    assert.equal(isLogoBulletLine('✓ Sociaal functioneren'), true);
    assert.equal(isLogoBulletLine('*italic alone*'), false);
    assert.equal(isLogoBulletLine('Intro zonder bullets'), false);
  });

  it('strips bullet prefixes including markdown *', () => {
    assert.equal(stripLogoBulletPrefix('* Statische houdingen'), 'Statische houdingen');
    assert.equal(stripLogoBulletPrefix('- Dynamische handelingen'), 'Dynamische handelingen');
    assert.equal(stripLogoBulletPrefix('• Aanpassing'), 'Aanpassing');
  });

  it('normalizes markdown and checkmark markers to canonical • lines', () => {
    const input = [
      'Intro tekst:',
      '',
      '- Aanpassing aan fysieke omgevingseisen',
      '* Dynamische handelingen',
      '☑ Statische houdingen',
      '✓ Werktijden',
      '',
      'Spreekuur intro.',
    ].join('\n');

    const normalized = normalizeLimitationsListMarkers(input);
    assert.match(normalized, /^• Aanpassing/m);
    assert.match(normalized, /^• Dynamische handelingen/m);
    assert.match(normalized, /^• Statische houdingen/m);
    assert.match(normalized, /^• Werktijden/m);
    assert.doesNotMatch(normalized, /^[-*☑✓]\s/m);
  });

  it('splits markdown * / - rubrieken the same as unicode •', () => {
    const withStars = [
      'Werknemer heeft beperkingen in de volgende rubrieken:',
      '',
      '* Aanpassing aan fysieke omgevingseisen',
      '* Dynamische handelingen',
      '',
      'Conform de terugkoppeling van het medisch spreekuur.',
    ].join('\n');

    const { intro, rest } = splitBeforeRubrieken(withStars);
    assert.match(intro, /volgende rubrieken/);
    assert.match(rest, /^\* Aanpassing/);

    const { bullets, spreekuurIntro } = splitAfterRubrieken(rest);
    assert.match(bullets, /\* Aanpassing/);
    assert.match(bullets, /\* Dynamische/);
    assert.match(spreekuurIntro, /medisch spreekuur/);
  });

  it('splits dash markers after intro', () => {
    const text = 'Intro.\n\n- Item A\n- Item B\n\nOutro.';
    const { intro, rest } = splitBeforeRubrieken(text);
    assert.equal(intro, 'Intro.');
    const { bullets, spreekuurIntro } = splitAfterRubrieken(rest);
    assert.match(bullets, /- Item A/);
    assert.equal(spreekuurIntro, 'Outro.');
  });
});
