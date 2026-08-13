import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TRANSPORT_TYPE_OPTIONS,
  addCustomTransportType,
  filterAllowedTransportTypes,
  isIntakeLockedTransportField,
  isKnownTransportType,
  removeTransportType,
  splitTransportTypes,
} from '../gegevens-field-options';

describe('TRANSPORT_TYPE_OPTIONS', () => {
  it('matches intake Hoe verplaatst checkboxes', () => {
    assert.deepEqual([...TRANSPORT_TYPE_OPTIONS], ['Auto', 'Fiets', 'OV', 'Lopend']);
    const options = TRANSPORT_TYPE_OPTIONS as readonly string[];
    assert.equal(options.includes('Lopend'), true);
    assert.equal(options.includes('Bromfiets'), false);
    assert.equal(options.includes('Motor'), false);
  });
});

describe('filterAllowedTransportTypes', () => {
  it('keeps only allowed values', () => {
    assert.deepEqual(filterAllowedTransportTypes(['Auto', 'Bromfiets', 'Lopend']), [
      'Auto',
      'Lopend',
    ]);
  });

  it('does not invent or keep free-text custom values', () => {
    assert.deepEqual(filterAllowedTransportTypes(['Auto', 'Scootmobiel']), ['Auto']);
    assert.deepEqual(filterAllowedTransportTypes(['Scootmobiel']), []);
  });
});

describe('isKnownTransportType', () => {
  it('recognizes only predetermined options', () => {
    assert.equal(isKnownTransportType('Auto'), true);
    assert.equal(isKnownTransportType(' Scootmobiel '), false);
  });
});

describe('splitTransportTypes', () => {
  it('separates known and custom values', () => {
    assert.deepEqual(splitTransportTypes(['Auto', 'Scootmobiel', 'Fiets', '']), {
      known: ['Auto', 'Fiets'],
      custom: ['Scootmobiel'],
    });
  });
});

describe('addCustomTransportType', () => {
  it('appends trimmed custom labels', () => {
    assert.deepEqual(addCustomTransportType(['Auto'], '  Scootmobiel  '), [
      'Auto',
      'Scootmobiel',
    ]);
  });

  it('rejects empty, duplicates, and known option labels', () => {
    assert.deepEqual(addCustomTransportType(['Auto'], '   '), ['Auto']);
    assert.deepEqual(addCustomTransportType(['Scootmobiel'], 'scootmobiel'), ['Scootmobiel']);
    assert.deepEqual(addCustomTransportType(['Fiets'], 'auto'), ['Fiets']);
  });
});

describe('removeTransportType', () => {
  it('removes one matching value', () => {
    assert.deepEqual(removeTransportType(['Auto', 'Scootmobiel', 'Fiets'], 'Scootmobiel'), [
      'Auto',
      'Fiets',
    ]);
  });
});

describe('isIntakeLockedTransportField', () => {
  it('locks transport_type only when intake was processed', () => {
    assert.equal(isIntakeLockedTransportField(true, 'transport_type'), true);
    assert.equal(isIntakeLockedTransportField(false, 'transport_type'), false);
    assert.equal(isIntakeLockedTransportField(true, 'drivers_license'), false);
  });
});
