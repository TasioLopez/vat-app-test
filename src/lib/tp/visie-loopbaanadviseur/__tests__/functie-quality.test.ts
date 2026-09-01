import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADVIES_DELIMITER, ADVIES_NB_NO_REPORT, ADVIES_NB_NO_REPORT_LEGACY } from '@/lib/tp/ad-advies/constants';
import {
  assessFunctieQuality,
  buildRegenerateFeedbackMessage,
  extractAdExclusionPhrases,
  normalizeFunctieNaam,
} from '../functie-quality';
import type { VisieLoopbaanadviseurContentResult } from '../schema';

describe('extractAdExclusionPhrases', () => {
  it('pulls bullet titles from advies quote block', () => {
    const advies = [
      'Intro door AD.',
      `${ADVIES_DELIMITER}`,
      'Ik denk aan eventuele functies zoals:',
      '• Receptionist hotel',
      '- Administratief medewerker zorg',
      '• Planner logistiek',
    ].join('\n');

    const phrases = extractAdExclusionPhrases(advies);
    assert.ok(phrases.some((p) => /receptionist hotel/i.test(p)));
    assert.ok(phrases.some((p) => /administratief medewerker zorg/i.test(p)));
    assert.ok(phrases.some((p) => /planner logistiek/i.test(p)));
  });

  it('returns empty for geen AD placeholder', () => {
    assert.deepEqual(extractAdExclusionPhrases(ADVIES_NB_NO_REPORT), []);
    assert.deepEqual(extractAdExclusionPhrases(ADVIES_NB_NO_REPORT_LEGACY), []);
    assert.deepEqual(extractAdExclusionPhrases(''), []);
    assert.deepEqual(extractAdExclusionPhrases(null), []);
  });
});

describe('normalizeFunctieNaam', () => {
  it('lowercases and strips punctuation', () => {
    assert.equal(
      normalizeFunctieNaam('Medewerker, Planning (ondersteunend)'),
      'medewerker planning ondersteunend'
    );
  });
});

describe('assessFunctieQuality', () => {
  it('fails Melissa-like near-clone titles and toelichting clones', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Medewerker klantcontact backoffice reisorganisatie',
          toelichting:
            'Backoffice in een prikkelarme setting zonder hoge tempo of strakke deadlines.',
        },
        {
          naam: 'Medewerker planning en administratie zakelijke dienstverlening',
          toelichting:
            'Planning en administratie in een prikkelarme setting zonder productiedruk.',
        },
        {
          naam: 'Projectmedewerker interne processen en documentatie',
          toelichting:
            'Documentatie in een prikkelarme omgeving zonder hoge tempo of deadlines.',
        },
      ],
    };

    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /Onderling te gelijk|Toelichtingen te gelijk/i.test(i)));
  });

  it('passes clearly distinct role titles with varied toelichtingen', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Junior reisadviseur ondersteuning',
          toelichting: 'Sluit aan bij haar opleiding Toerisme en recreatie.',
        },
        {
          naam: 'Roostermaker hospitaliteit',
          toelichting: 'Past bij haar ervaring met organiseren als Supervisor.',
        },
        {
          naam: 'Documentcontroleur luchtvaartdossiers',
          toelichting: 'Vraagt nauwkeurigheid en digitale vaardigheden zonder fysieke piekbelasting.',
        },
      ],
    };

    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, true, result.issues.join(' | '));
  });

  it('fails when proposed naam overlaps AD exclusion phrase', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Receptionist hotel',
          toelichting: 'Past bij haar gastvrijheidsachtergrond.',
        },
        {
          naam: 'Roostermaker hospitaliteit',
          toelichting: 'Past bij organisatorische ervaring.',
        },
        {
          naam: 'Documentcontroleur dossiers',
          toelichting: 'Past bij nauwkeurige digitale vaardigheden.',
        },
      ],
    };

    const result = assessFunctieQuality(content, ['Receptionist hotel']);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /AD-overlap/i.test(i)));
  });

  it('fails when suggestion overlaps kept or rejected names', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        { naam: 'Junior reisadviseur', toelichting: 'Opleiding toerisme.' },
        { naam: 'Roostermaker zorg', toelichting: 'Organisatie-ervaring.' },
        { naam: 'Documentcontroleur', toelichting: 'Digitale vaardigheden.' },
      ],
    };
    const result = assessFunctieQuality(content, {
      keptNames: ['Junior reisadviseur ondersteuning'],
      rejectedNames: ['Documentcontroleur dossiers'],
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /Behouden-overlap|Afgewezen-overlap/i.test(i)));
  });
});

describe('buildRegenerateFeedbackMessage', () => {
  it('includes kept, rejected and user feedback', () => {
    const msg = buildRegenerateFeedbackMessage({
      kept: [{ naam: 'Planner A', toelichting: 'x' }],
      rejectedNames: ['Functie B'],
      userFeedback: 'Meer administratief',
      batchSize: 5,
    });
    assert.match(msg, /REGENERATIE/);
    assert.match(msg, /Planner A/);
    assert.match(msg, /Functie B/);
    assert.match(msg, /Meer administratief/);
    assert.match(msg, /exact 5/);
  });
});
