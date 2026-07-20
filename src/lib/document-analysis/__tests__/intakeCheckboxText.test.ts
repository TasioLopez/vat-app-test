import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyIntakeCheckboxTextOverrides,
  detectDriversLicenseFromIntakeText,
  detectTransportFromIntakeText,
} from '../intakeCheckboxText';

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
});

describe('applyIntakeCheckboxTextOverrides', () => {
  it('overwrites wrong vision arrays with Hippman text truth', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto', 'Fiets', 'OV', 'Lopend'],
      drivers_license_type: ['B', 'BE', 'Code 95'],
      drivers_license: true,
    };
    applyIntakeCheckboxTextOverrides(mapped, HIPPMAN_RIJBEWIJS_VERVOER);
    assert.deepEqual(mapped.transport_type, ['Auto']);
    assert.deepEqual(mapped.drivers_license_type, ['B']);
    assert.equal(mapped.drivers_license, true);
  });

  it('leaves vision values when text is inconclusive', () => {
    const mapped: Record<string, unknown> = {
      transport_type: ['Auto', 'Fiets'],
      drivers_license_type: ['B', 'BE'],
    };
    applyIntakeCheckboxTextOverrides(mapped, 'geen checkboxes hier');
    assert.deepEqual(mapped.transport_type, ['Auto', 'Fiets']);
    assert.deepEqual(mapped.drivers_license_type, ['B', 'BE']);
  });
});
