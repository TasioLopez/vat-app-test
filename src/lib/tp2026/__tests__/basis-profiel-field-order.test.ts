import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TP2026_TP3_FIELD_ORDER } from '@/lib/autofill-progress';
import {
  TP2026_PROFIEL_WERKNEMER_FIELD_ORDER,
} from '@/lib/tp2026/basis-profiel-field-order';
import { TP2026BasisFields } from '@/lib/tp2026/schema';

const EXPECTED_PROFIEL_ORDER = [
  'sociale_achtergrond',
  'visie_werknemer',
  'persoonlijk_profiel',
  'prognose_bedrijfsarts',
  'praktische_belemmeringen',
  'advies_ad_passende_arbeid',
  'pow_meter',
  'visie_plaatsbaarheid',
  'visie_loopbaanadviseur',
  'zoekprofiel',
] as const;

describe('TP2026_PROFIEL_WERKNEMER_FIELD_ORDER', () => {
  it('has exactly 10 profiel fields in official order', () => {
    assert.deepEqual([...TP2026_PROFIEL_WERKNEMER_FIELD_ORDER], [...EXPECTED_PROFIEL_ORDER]);
  });
});

describe('TP2026_TP3_FIELD_ORDER', () => {
  it('matches profiel order after inleiding', () => {
    assert.equal(TP2026_TP3_FIELD_ORDER[0], 'inleiding');
    assert.deepEqual(
      TP2026_TP3_FIELD_ORDER.slice(1),
      EXPECTED_PROFIEL_ORDER
    );
  });
});

describe('TP2026BasisFields', () => {
  it('lists profiel fields in the same order after intro fields', () => {
    const introKeys = ['inleiding', 'inleiding_sub', 'wettelijke_kaders'];
    const basisKeys = TP2026BasisFields.map((f) => f.key);

    assert.deepEqual(basisKeys.slice(0, 3), introKeys);
    assert.deepEqual(basisKeys.slice(3), EXPECTED_PROFIEL_ORDER);
  });

  it('labels prognose_bedrijfsarts as Belastbaarheidsprofiel', () => {
    const field = TP2026BasisFields.find((f) => f.key === 'prognose_bedrijfsarts');
    assert.equal(field?.label, 'Belastbaarheidsprofiel');
  });

  it('labels visie_plaatsbaarheid as Visie op plaatsbaarheid', () => {
    const field = TP2026BasisFields.find((f) => f.key === 'visie_plaatsbaarheid');
    assert.equal(field?.label, 'Visie op plaatsbaarheid');
  });
});
