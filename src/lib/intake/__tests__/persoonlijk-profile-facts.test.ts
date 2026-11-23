import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ensureIntakeShape } from '@/lib/intake/schema';
import {
  resolvePersoonlijkProfileFacts,
  workerFactsForPersoonlijkProfiel,
} from '@/lib/intake/tp-source';
import {
  assembleAlinea2FromProfileFacts,
  buildPersoonlijkProfielFields,
} from '@/lib/tp/persoonlijk-profiel/build-fields';

describe('persoonlijk profile facts from WorkerFacts', () => {
  it('maps employee_details / WorkerFacts into profile_facts shape', () => {
    const facts = workerFactsForPersoonlijkProfiel({
      drivers_license_type: ['B'],
      dutch_speaking: 'Goed',
      dutch_writing: 'Goed',
      dutch_reading: 'Goed',
      computer_skills: '4',
      has_computer: true,
    });
    assert.deepEqual(facts.rijbewijs, ['B']);
    assert.equal(facts.nederlands_spreken, 'Goed');
    assert.ok(facts.computervaardigheden);
    assert.equal(facts.has_pc, true);
  });

  it('fills blank intake s17 from WorkerFacts for alinea_2', () => {
    const blankedIntake = ensureIntakeShape({
      s17: {
        drivers_license_types: [],
        dutch_speaking: '',
        dutch_writing: '',
        dutch_reading: '',
        computer_skills: '',
        has_pc: false,
      },
    });
    const merged = resolvePersoonlijkProfileFacts(blankedIntake, {
      drivers_license_type: ['B'],
      dutch_speaking: 'Goed',
      dutch_writing: 'Goed',
      dutch_reading: 'Goed',
      computer_skills: '4',
      has_computer: true,
    });
    const alinea2 = assembleAlinea2FromProfileFacts(merged);
    assert.match(alinea2, /rijbewijs B/i);
    assert.match(alinea2, /Nederlandse taal/i);
    assert.match(alinea2, /computer/i);

    const { persoonlijk_profiel } = buildPersoonlijkProfielFields(
      {
        employee: { first_name: 'Mourad', last_name: 'Test' },
        details: { gender: 'Man', date_of_birth: '1985-01-01' },
      },
      {
        alinea_1: 'Werknemer is een 40-jarige man.',
        alinea_2: 'Kort.',
        alinea_3: null,
      },
      merged
    );
    assert.match(persoonlijk_profiel, /rijbewijs B/i);
    assert.match(persoonlijk_profiel, /Nederlandse taal/i);
    assert.match(persoonlijk_profiel, /computer/i);
  });
});
