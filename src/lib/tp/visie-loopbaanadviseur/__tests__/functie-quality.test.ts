import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADVIES_DELIMITER, ADVIES_NB_NO_REPORT, ADVIES_NB_NO_REPORT_LEGACY } from '@/lib/tp/ad-advies/constants';
import {
  assessFunctieQuality,
  buildRegenerateFeedbackMessage,
  buildRepairFeedbackMessage,
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
          anker: 'werkervaring',
          anker_detail: 'reisorganisatie',
        },
        {
          naam: 'Medewerker planning en administratie zakelijke dienstverlening',
          toelichting:
            'Planning en administratie in een prikkelarme setting zonder productiedruk.',
          anker: 'werkervaring',
          anker_detail: 'planning',
        },
        {
          naam: 'Projectmedewerker interne processen en documentatie',
          toelichting:
            'Documentatie in een prikkelarme omgeving zonder hoge tempo of deadlines.',
          anker: 'opleiding',
          anker_detail: 'administratie',
        },
      ],
    };

    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some((i) =>
        /Onderling te gelijk|Toelichtingen te gelijk|niche\/lang/i.test(i)
      )
    );
  });

  it('passes clearly distinct role titles with ankers and varied toelichtingen', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Reisadviseur',
          toelichting: 'Sluit aan bij haar opleiding Toerisme en recreatie.',
          anker: 'opleiding',
          anker_detail: 'Toerisme en recreatie',
        },
        {
          naam: 'Roostermaker',
          toelichting: 'Past bij haar ervaring met organiseren als Supervisor.',
          anker: 'werkervaring',
          anker_detail: 'Supervisor',
        },
        {
          naam: 'Documentcontroleur',
          toelichting: 'Past bij zoekprofiel administratief en digitale vaardigheden.',
          anker: 'zoekprofiel',
          anker_detail: 'administratief',
        },
      ],
    };

    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, true, result.issues.join(' | '));
  });

  it('fails when anker is missing', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Receptionist',
          toelichting: 'Past bij haar gastvrijheidsachtergrond.',
        },
      ],
    };
    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /anker/i.test(i)));
  });

  it('fails niche overlong titles', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Klantcontact backoffice reisorganisatie planning documentatie dossiervorming kwaliteitscontrole',
          toelichting: 'Past bij opleiding toerisme.',
          anker: 'opleiding',
          anker_detail: 'toerisme',
        },
      ],
    };
    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /niche\/lang/i.test(i)));
  });

  it('fails limitations-only toelichting without profile link', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Administratief medewerker',
          toelichting: 'Passend in een prikkelarme setting zonder hoge tempo.',
          anker: 'werkervaring',
          anker_detail: 'admin',
        },
      ],
    };
    const result = assessFunctieQuality(content, []);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /profielbrug/i.test(i)));
  });

  it('fails when proposed naam overlaps AD exclusion phrase', () => {
    const content: VisieLoopbaanadviseurContentResult = {
      functies: [
        {
          naam: 'Receptionist hotel',
          toelichting: 'Past bij haar gastvrijheidsachtergrond.',
          anker: 'werkervaring',
          anker_detail: 'hotel',
        },
        {
          naam: 'Roostermaker',
          toelichting: 'Past bij organisatorische ervaring.',
          anker: 'werkervaring',
          anker_detail: 'planning',
        },
        {
          naam: 'Documentcontroleur',
          toelichting: 'Past bij opleiding administratie.',
          anker: 'opleiding',
          anker_detail: 'administratie',
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
        {
          naam: 'Junior reisadviseur',
          toelichting: 'Opleiding toerisme.',
          anker: 'opleiding',
          anker_detail: 'toerisme',
        },
        {
          naam: 'Roostermaker zorg',
          toelichting: 'Organisatie-ervaring.',
          anker: 'werkervaring',
          anker_detail: 'zorg',
        },
        {
          naam: 'Documentcontroleur',
          toelichting: 'Digitale vaardigheden uit zoekprofiel.',
          anker: 'zoekprofiel',
          anker_detail: 'digitaal',
        },
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

describe('buildRepairFeedbackMessage', () => {
  it('mentions realism when niche or anker issues fire', () => {
    const msg = buildRepairFeedbackMessage(
      ['Titel te niche/lang: "Foo"', 'Ontbrekend anker voor "Bar"'],
      ['Foo'],
      5
    );
    assert.match(msg, /REPARATIE/);
    assert.match(msg, /Realisme/);
  });
});
