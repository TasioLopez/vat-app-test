import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersoonlijkProfielFields,
  calculateAge,
  hasValidOpening,
  sanitizeFragment,
  stripChronologySentences,
  stripCitations,
  stripSmartphoneWhenPcPresent,
  stripSoftTraitSentences,
  stripSourceReferenceSentences,
  type PersoonlijkProfielBuildContext,
} from '../build-fields';
import type { PersoonlijkProfielContentResult } from '../schema';

const baseCtx: PersoonlijkProfielBuildContext = {
  employee: { first_name: 'Kim', last_name: 'Baaijens' },
  details: { gender: 'Vrouw', date_of_birth: '1985-03-15' },
};

describe('buildPersoonlijkProfielFields', () => {
  it('joins alinea_1 and alinea_2 and always drops alinea_3', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 58-jarige vrouw met circa vijf jaar werkervaring als huishoudelijk ondersteuner. Werknemer heeft de mavo afgerond.',
      alinea_2:
        'Werknemer beschikt over rijbewijs B. De Nederlandse taal beheerst werknemer goed in spreken, lezen en schrijven.',
      alinea_3: 'Werknemer wordt omschreven als nauwkeurig en klantgericht.',
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    const parts = persoonlijk_profiel.split('\n\n');
    assert.equal(parts.length, 2);
    assert.match(parts[0], /58-jarige vrouw/);
    assert.match(parts[1], /rijbewijs B/);
    assert.doesNotMatch(persoonlijk_profiel, /nauwkeurig/);
  });

  it('returns two paragraphs when alinea_3 is null', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 41-jarige vrouw met ruim twintig jaar werkervaring als docent.',
      alinea_2: 'Werknemer verplaatst zich voornamelijk per fiets.',
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.equal(persoonlijk_profiel.split('\n\n').length, 2);
  });

  it('returns empty string when all alineas are null', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1: null,
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.equal(persoonlijk_profiel, '');
  });

  it('strips accidental section heading from alinea text', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Persoonlijk profiel Werknemer is een 50-jarige man met tien jaar werkervaring als magazijnmedewerker.',
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.ok(!persoonlijk_profiel.startsWith('Persoonlijk profiel'));
    assert.match(persoonlijk_profiel, /50-jarige man/);
  });

  it('collapses internal newlines within a paragraph', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 45-jarige vrouw met ervaring als verpleegkundige.\n\nWerknemer heeft mbo-4 afgerond.',
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.ok(!persoonlijk_profiel.includes('\n\n\n'));
    assert.match(persoonlijk_profiel, /verpleegkundige.*mbo-4/);
  });

  it('removes sentences that reference the intakeformulier', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 34-jarige vrouw met circa dertien jaar werkervaring als Supervisor. Verdere expliciet benoemde vaardigheden zijn in het intakeformulier niet opgenomen.',
      alinea_2: 'Werknemer beschikt over rijbewijs B.',
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.doesNotMatch(persoonlijk_profiel, /intakeformulier/i);
    assert.match(persoonlijk_profiel, /Supervisor/);
    assert.match(persoonlijk_profiel, /rijbewijs B/);
  });

  it('strips chronology sentences from alinea_1', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 32-jarige vrouw met circa twaalf jaar werkervaring als logistiek coördinator, transportplanner en logistiek medewerker. Werknemer is sinds 2022 werkzaam als logistiek coördinator. Daarvoor heeft zij tussen 2018 en 2022 gewerkt als transportplanner. Werknemer heeft de opleiding MBO 4 Manager Transport & Logistiek afgerond.',
      alinea_2: null,
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.doesNotMatch(persoonlijk_profiel, /sinds 2022/i);
    assert.doesNotMatch(persoonlijk_profiel, /tussen 2018 en 2022/i);
    assert.match(persoonlijk_profiel, /32-jarige vrouw/);
    assert.match(persoonlijk_profiel, /MBO 4/);
  });

  it('strips soft motivation and judgment sentences', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1:
        'Werknemer is een 42-jarige vrouw met werkervaring als Senior Docent Economie. Werknemer wordt omschreven als soms te aardig en te lief.',
      alinea_2: 'Werknemer wordt omschreven als erg gemotiveerd. Werknemer beschikt over rijbewijs B.',
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.doesNotMatch(persoonlijk_profiel, /omschreven als/i);
    assert.doesNotMatch(persoonlijk_profiel, /gemotiveerd/i);
    assert.doesNotMatch(persoonlijk_profiel, /te aardig/i);
    assert.match(persoonlijk_profiel, /Senior Docent Economie/);
    assert.match(persoonlijk_profiel, /rijbewijs B/);
  });

  it('removes smartphone when PC or laptop is also present', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1: 'Werknemer is een 32-jarige vrouw met circa twaalf jaar werkervaring als logistiek coördinator.',
      alinea_2:
        'Werknemer beschikt over een pc of laptop, maakt gebruik van een smartphone, heeft geavanceerde computervaardigheden en beschikt over goede typvaardigheden.',
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.doesNotMatch(persoonlijk_profiel, /smartphone/i);
    assert.match(persoonlijk_profiel, /pc of laptop/i);
    assert.match(persoonlijk_profiel, /typvaardigheden/i);
  });

  it('keeps smartphone when no PC or laptop is mentioned', () => {
    const content: PersoonlijkProfielContentResult = {
      alinea_1: 'Werknemer is een 40-jarige man met vijf jaar werkervaring als magazijnmedewerker.',
      alinea_2: 'Werknemer beschikt over een smartphone en heeft basis computervaardigheden.',
      alinea_3: null,
    };

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(baseCtx, content);
    assert.match(persoonlijk_profiel, /smartphone/i);
  });
});

describe('stripChronologySentences', () => {
  it('drops sentences with year ranges and sinds', () => {
    const input =
      'Werknemer heeft ervaring als planner. Werknemer is sinds 2022 werkzaam als coördinator. Werknemer heeft mbo afgerond.';
    const result = stripChronologySentences(input);
    assert.doesNotMatch(result, /sinds 2022/i);
    assert.match(result, /ervaring als planner/);
    assert.match(result, /mbo afgerond/);
  });
});

describe('stripSoftTraitSentences', () => {
  it('drops soft judgment sentences', () => {
    const input =
      'Werknemer heeft hbo afgerond. Werknemer wordt omschreven als te aardig. Werknemer beschikt over rijbewijs B.';
    const result = stripSoftTraitSentences(input);
    assert.doesNotMatch(result, /omschreven/i);
    assert.match(result, /hbo afgerond/);
    assert.match(result, /rijbewijs B/);
  });
});

describe('stripSmartphoneWhenPcPresent', () => {
  it('strips smartphone clause when pc is present', () => {
    const input =
      'Werknemer beschikt over een pc of laptop, maakt gebruik van een smartphone, en heeft goede typvaardigheden.';
    const result = stripSmartphoneWhenPcPresent(input);
    assert.doesNotMatch(result, /smartphone/i);
    assert.match(result, /pc of laptop/i);
  });

  it('keeps smartphone when no pc or laptop', () => {
    const input = 'Werknemer beschikt over een smartphone.';
    assert.match(stripSmartphoneWhenPcPresent(input), /smartphone/i);
  });
});

describe('stripSourceReferenceSentences', () => {
  it('drops sentences containing intakeformulier', () => {
    const input =
      'Werknemer is een 34-jarige vrouw. Verdere vaardigheden zijn in het intakeformulier niet opgenomen. Werknemer heeft mbo afgerond.';
    const result = stripSourceReferenceSentences(input);
    assert.doesNotMatch(result, /intakeformulier/i);
    assert.match(result, /34-jarige vrouw/);
    assert.match(result, /mbo afgerond/);
  });
});

describe('sanitizeFragment', () => {
  it('strips banned phrases about missing intake information', () => {
    const result = sanitizeFragment(
      'Werknemer is een supervisor. Verdere expliciet benoemde vaardigheden zijn niet opgenomen.'
    );
    assert.doesNotMatch(result, /niet opgenomen/i);
    assert.match(result, /supervisor/i);
  });
});

describe('hasValidOpening', () => {
  it('returns true when alinea starts with mandatory opening prefix', () => {
    assert.equal(
      hasValidOpening('Werknemer is een 58-jarige vrouw met vijf jaar werkervaring als ondersteuner.'),
      true
    );
  });

  it('returns false when opening prefix is missing', () => {
    assert.equal(hasValidOpening('De werknemer heeft mbo-4 afgerond.'), false);
  });
});

describe('calculateAge', () => {
  it('computes age from ISO date of birth', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 40);
    const iso = dob.toISOString().slice(0, 10);
    assert.equal(calculateAge(iso), 40);
  });

  it('returns null for invalid date', () => {
    assert.equal(calculateAge('invalid'), null);
  });
});

describe('stripCitations', () => {
  it('removes pdf citation markers', () => {
    assert.equal(stripCitations('Tekst [1:2/intake.pdf] verder'), 'Tekst verder');
  });
});

describe('parsePersoonlijkProfielContentResult', () => {
  it('coerces empty strings to null and always nulls alinea_3', async () => {
    const { parsePersoonlijkProfielContentResult } = await import('../schema');
    const result = parsePersoonlijkProfielContentResult({
      alinea_1: '  ',
      alinea_2: 'Tekst',
      alinea_3: 'Werknemer wordt omschreven als nauwkeurig.',
    });
    assert.equal(result.alinea_1, null);
    assert.equal(result.alinea_2, 'Tekst');
    assert.equal(result.alinea_3, null);
  });
});
