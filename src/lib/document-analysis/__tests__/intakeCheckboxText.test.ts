import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyIntakeCheckboxTextOverrides,
  detectDriversLicenseFromIntakeText,
  detectTransportFromIntakeText,
} from '../intakeCheckboxText';
import { inferDriversLicenseFromOwnCar } from '../inferLicenseFromOwnCar';

const HIPPMAN_RIJBEWIJS_VERVOER = `
Rijbewijzen
[ ] AM – Bromfiets                   [ ] A1 – Lichte motor
[ ] A2 – Middelzware motor  [ ] A – Zware / onbeperkte motor
[X] B – Personenauto               [ ] BE – Personenauto met aanhanger
[ ] B+ (Code 96) – Personenauto
met zwaardere aanhanger
[ ] C1 – Lichte vrachtwagen   [ ] C1E – Lichte vrachtwagen met aanhanger
[ ] C – Vrachtwagen                 [ ] CE – Vrachtwagen met aanhanger
[ ] D1 – Kleine bus                     [ ] D1E – Kleine bus met
aanhanger
[ ] D – Bus                                   [ ] DE – Bus met aanhanger
[ ] T – Tractor                              [ ] Code 95
Hoe verplaatst werknemer zich:
[X] Auto [ ] Fiets [ ] OV [ ] Lopend [ ] Anders namelijk:
`;

const ALL_UNCHECKED_INTAKE = `
Rijbewijzen
☐ B – Personenauto               ☐ BE – Personenauto met aanhanger
Hoe verplaatst werknemer zich:
☐ Auto ☐ Fiets ☐ OV ☐ Lopend ☐ Anders namelijk:
`;

describe('detectDriversLicenseFromIntakeText', () => {
  it('detects only B for Hippman-style unchecked BE/Code 95', () => {
    assert.deepEqual(detectDriversLicenseFromIntakeText(HIPPMAN_RIJBEWIJS_VERVOER), ['B']);
  });

  it('includes BE and Code 95 when checked', () => {
    const text = `
[X] B – Personenauto               [X] BE – Personenauto met aanhanger
[ ] Code 95
`;
    // Code 95 unchecked
    assert.deepEqual(detectDriversLicenseFromIntakeText(text), ['B', 'BE']);

    const withCode95 = `
[X] B – Personenauto
[X] Code 95
`;
    assert.deepEqual(detectDriversLicenseFromIntakeText(withCode95), ['B', 'Code 95']);
  });

  it('returns null when no checkbox glyphs near labels', () => {
    assert.equal(detectDriversLicenseFromIntakeText('Rijbewijs B aanwezig'), null);
    assert.equal(detectDriversLicenseFromIntakeText(''), null);
    assert.equal(detectDriversLicenseFromIntakeText(null), null);
  });

  it('returns empty array when glyphs exist but nothing is checked', () => {
    assert.deepEqual(detectDriversLicenseFromIntakeText(ALL_UNCHECKED_INTAKE), []);
  });
});

describe('detectTransportFromIntakeText', () => {
  it('detects Auto only for Hippman-style row', () => {
    assert.deepEqual(detectTransportFromIntakeText(HIPPMAN_RIJBEWIJS_VERVOER), ['Auto']);
  });

  it('detects multiple checked vervoer options', () => {
    const text = `
Hoe verplaatst werknemer zich:
[X] Auto [X] Fiets [ ] OV [ ] Lopend
`;
    assert.deepEqual(detectTransportFromIntakeText(text), ['Auto', 'Fiets']);
  });

  it('returns null when Hoe-verplaatst section missing or without glyphs', () => {
    assert.equal(detectTransportFromIntakeText('Werknemer rijdt auto'), null);
  });

  it('returns empty array when vervoer row is all unchecked', () => {
    assert.deepEqual(detectTransportFromIntakeText(ALL_UNCHECKED_INTAKE), []);
  });
});

describe('applyIntakeCheckboxTextOverrides', () => {
  it('overwrites wrong vision arrays with Hippman text truth', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto', 'Fiets', 'OV', 'Lopend'],
      drivers_license_type: ['B', 'BE', 'Code 95'],
      drivers_license: true,
    };
    const sources = applyIntakeCheckboxTextOverrides(mapped, HIPPMAN_RIJBEWIJS_VERVOER);
    assert.deepEqual(mapped.transport_type, ['Auto']);
    assert.deepEqual(mapped.drivers_license_type, ['B']);
    assert.equal(mapped.drivers_license, true);
    assert.equal(sources.transportSource, 'text');
    assert.equal(sources.licenseSource, 'text');
  });

  it('preserves mapped values when intake text has no positive checkbox selection', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto', 'OV'],
      drivers_license_type: ['B', 'BE'],
      drivers_license: true,
    };
    const sources = applyIntakeCheckboxTextOverrides(mapped, 'geen checkboxes hier');
    assert.deepEqual(mapped.transport_type, ['Auto', 'OV']);
    assert.deepEqual(mapped.drivers_license_type, ['B', 'BE']);
    assert.equal(mapped.drivers_license, true);
    assert.equal(sources.transportSource, 'absent');
    assert.equal(sources.licenseSource, 'absent');
  });

  it('clears invented license when intake rijbewijs checkboxes are all unchecked', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto'],
      drivers_license: true,
      drivers_license_type: ['B', 'BE'],
    };
    const sources = applyIntakeCheckboxTextOverrides(mapped, ALL_UNCHECKED_INTAKE);
    // Transport still absent (gap-fill); license glyphs all ☐ are authoritative clear.
    assert.deepEqual(mapped.transport_type, ['Auto']);
    assert.equal(mapped.drivers_license, false);
    assert.deepEqual(mapped.drivers_license_type, []);
    assert.equal(sources.transportSource, 'absent');
    assert.equal(sources.licenseSource, 'cleared');
  });

  it('leaves mapped alone when text is empty', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto', 'OV'],
    };
    const sources = applyIntakeCheckboxTextOverrides(mapped, '');
    assert.deepEqual(mapped.transport_type, ['Auto', 'OV']);
    assert.equal(sources.transportSource, 'absent');
    assert.equal(sources.licenseSource, 'absent');
    assert.equal(sources.exWerknemerSource, 'absent');
  });

  it('sets is_ex_werknemer from Ex-werknemer checkbox text', () => {
    const mapped: Record<string, unknown> = { is_ex_werknemer: false };
    const sources = applyIntakeCheckboxTextOverrides(mapped, '☒ Ex-werknemer');
    assert.equal(mapped.is_ex_werknemer, true);
    assert.equal(sources.exWerknemerSource, 'text');

    const mappedOff: Record<string, unknown> = { is_ex_werknemer: true };
    applyIntakeCheckboxTextOverrides(mappedOff, '☐ Ex-werknemer');
    assert.equal(mappedOff.is_ex_werknemer, false);
  });

  it('blocks Auto→B after all-☐ rijbewijs glyphs (cleared)', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto'],
      drivers_license: false,
      drivers_license_type: [],
    };
    const sources = applyIntakeCheckboxTextOverrides(mapped, ALL_UNCHECKED_INTAKE);
    assert.equal(sources.licenseSource, 'cleared');
    assert.equal(
      inferDriversLicenseFromOwnCar(mapped, { skip: sources.licenseSource !== 'absent' }),
      false
    );
    assert.equal(mapped.drivers_license, false);
    assert.deepEqual(mapped.drivers_license_type, []);
  });

  it('still allows Auto→B when no license glyphs are present', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto'],
      drivers_license: false,
      drivers_license_type: [],
    };
    const sources = applyIntakeCheckboxTextOverrides(mapped, 'geen checkboxes hier');
    assert.equal(sources.licenseSource, 'absent');
    assert.equal(inferDriversLicenseFromOwnCar(mapped, { skip: false }), true);
    assert.deepEqual(mapped.drivers_license_type, ['B']);
  });
});
