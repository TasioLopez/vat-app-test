import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inferDriversLicenseFromOwnCar } from '../inferLicenseFromOwnCar';

describe('inferDriversLicenseFromOwnCar', () => {
  it('assumes B when transport is Auto and no license type is set', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto'],
      drivers_license: false,
      drivers_license_type: [],
    };
    assert.equal(inferDriversLicenseFromOwnCar(mapped), true);
    assert.equal(mapped.drivers_license, true);
    assert.deepEqual(mapped.drivers_license_type, ['B']);
  });

  it('does not override an explicit non-B license type', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto'],
      drivers_license: true,
      drivers_license_type: ['C'],
    };
    assert.equal(inferDriversLicenseFromOwnCar(mapped), false);
    assert.deepEqual(mapped.drivers_license_type, ['C']);
  });

  it('does nothing without Auto transport', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['OV'],
      drivers_license: false,
    };
    assert.equal(inferDriversLicenseFromOwnCar(mapped), false);
    assert.equal(mapped.drivers_license, false);
    assert.equal(mapped.drivers_license_type, undefined);
  });

  it('skips Auto→B when intake PDF / glyph detection asks to skip', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto'],
      drivers_license: false,
      drivers_license_type: [],
    };
    assert.equal(inferDriversLicenseFromOwnCar(mapped, { skip: true }), false);
    assert.equal(mapped.drivers_license, false);
    assert.deepEqual(mapped.drivers_license_type, []);
  });
});
