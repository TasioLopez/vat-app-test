import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyDoctorRolesFromText,
  detectDoctorRolesFromText,
} from '@/lib/tp/intake-doctor-roles';
import { resolveOccupationalDoctorLabel } from '@/lib/tp/format-context';
import { normalizeTp2ExtractedData } from '@/lib/tp2026/intake-tp2-normalize';

const HIPPMAN_ROWS = `
     Naam ☒ Arts ☐ Anios ☐ BA ☐ VA: P. Mort Datum AD-
rapport:
 27-6-2026                                               Concept ☐
     OSV ☐ Arts ☐ Anios ☒ BA: K. Julien Naam AD:  S. Kowalski
`;

describe('detectDoctorRolesFromText', () => {
  it('detects Hippman Arts primary + OSV BA with names', () => {
    const detected = detectDoctorRolesFromText(HIPPMAN_ROWS);
    assert.equal(detected.doctor_role, 'Arts');
    assert.equal(detected.osv_doctor_role, 'BA');
    assert.equal(detected.primary_name, 'P. Mort');
    assert.equal(detected.osv_name, 'K. Julien');
  });

  it('detects VA-only primary row', () => {
    const text = 'Naam ☐ Arts ☐ Anios ☐ BA ☒ VA: A.J. Karim\nOSV ☐ Arts ☐ Anios ☐ BA ☐ VA:';
    const detected = detectDoctorRolesFromText(text);
    assert.equal(detected.doctor_role, 'VA');
    assert.equal(detected.primary_name, 'A.J. Karim');
    assert.equal(detected.osv_doctor_role, null);
  });

  it('returns null roles when role labels have no checkbox glyphs', () => {
    const text = 'Naam Arts Anios BA VA: P. Mort\nOSV Arts Anios BA: K. Julien';
    const detected = detectDoctorRolesFromText(text);
    assert.equal(detected.doctor_role, null);
    assert.equal(detected.osv_doctor_role, null);
  });

  it('detects OSV-only when primary has no checked role', () => {
    const text = `
Naam ☐ Arts ☐ Anios ☐ BA ☐ VA: P. Mort
OSV ☐ Arts ☐ Anios ☒ BA: K. Julien
`;
    const detected = detectDoctorRolesFromText(text);
    assert.equal(detected.doctor_role, null);
    assert.equal(detected.osv_doctor_role, 'BA');
    assert.equal(detected.osv_name, 'K. Julien');
  });

  it('returns inconclusive when multiple roles are checked on one row', () => {
    const text = 'Naam ☒ Arts ☒ Anios ☐ BA ☐ VA: P. Mort\nOSV ☐ Arts ☐ Anios ☒ BA: K. Julien';
    const detected = detectDoctorRolesFromText(text);
    assert.equal(detected.doctor_role, null);
    assert.equal(detected.osv_doctor_role, 'BA');
  });
});

describe('applyDoctorRolesFromText + normalize', () => {
  it('forces Hippman Arts + OSV BA supervisie phrase and Arts label', () => {
    const detected = detectDoctorRolesFromText(HIPPMAN_ROWS);
    const merged = applyDoctorRolesFromText(
      {
        occupational_doctor_org: 'P. Mort',
        doctor_role: null,
        osv_doctor_name: null,
        osv_doctor_role: null,
      },
      detected
    );
    const normalized = normalizeTp2ExtractedData(merged);

    assert.equal(
      normalized.occupational_doctor_org,
      'Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
    assert.equal(
      resolveOccupationalDoctorLabel(String(normalized.occupational_doctor_org)),
      'Arts'
    );
  });

  it('overrides wrong model roles with text detection', () => {
    const detected = detectDoctorRolesFromText(HIPPMAN_ROWS);
    const merged = applyDoctorRolesFromText(
      {
        occupational_doctor_org: 'Bedrijfsarts P. Mort',
        doctor_role: 'BA',
        osv_doctor_name: 'K. Julien',
        osv_doctor_role: 'VA',
      },
      detected
    );
    const normalized = normalizeTp2ExtractedData(merged);

    assert.equal(merged.doctor_role, 'Arts');
    assert.equal(merged.osv_doctor_role, 'BA');
    assert.equal(merged.occupational_doctor_org, 'P. Mort');
    assert.equal(
      normalized.occupational_doctor_org,
      'Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });

  it('leaves model unchanged when text has no role signal', () => {
    const model = {
      occupational_doctor_org: 'P. Mort',
      doctor_role: 'VA',
    };
    const next = applyDoctorRolesFromText(model, detectDoctorRolesFromText('hello world'));
    assert.deepEqual(next, model);
  });
});
