import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TRANSPORT_TYPE_OPTIONS,
  filterAllowedTransportTypes,
  isIntakeLockedTransportField,
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
});

describe('isIntakeLockedTransportField', () => {
  it('locks transport_type only when intake was processed', () => {
    assert.equal(isIntakeLockedTransportField(true, 'transport_type'), true);
    assert.equal(isIntakeLockedTransportField(false, 'transport_type'), false);
    assert.equal(isIntakeLockedTransportField(true, 'drivers_license'), false);
  });
});
