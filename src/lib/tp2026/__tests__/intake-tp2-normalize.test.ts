import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOccupationalDoctorOrg,
  normalizeTp2ExtractedData,
} from '../intake-tp2-normalize';

describe('normalizeTp2ExtractedData — Calvin case dates', () => {
  it('normalizes Dutch dates to ISO', () => {
    const result = normalizeTp2ExtractedData({
      registration_date: '4-2-2026',
      intake_date: '5 juni 2026',
      fml_izp_lab_date: '19-1-2026',
      ad_report_date: '2-2-2026',
      tp_start_date: '5-6-2026',
      tp_end_date: '5-7-2027',
    });

    assert.equal(result.registration_date, '2026-02-04');
    assert.equal(result.intake_date, '2026-06-05');
    assert.equal(result.fml_izp_lab_date, '2026-01-19');
    assert.equal(result.ad_report_date, '2026-02-02');
    assert.equal(result.tp_start_date, '2026-06-05');
    assert.equal(result.tp_end_date, '2027-07-05');
  });

  it('drops registration_date when it collides with fml_izp_lab_date', () => {
    const result = normalizeTp2ExtractedData({
      registration_date: '19-1-2026',
      fml_izp_lab_date: '19-1-2026',
    });

    assert.equal(result.fml_izp_lab_date, '2026-01-19');
    assert.equal(result.registration_date, undefined);
  });
});

describe('formatOccupationalDoctorOrg', () => {
  it('prefixes VA role with Verzekeringsarts', () => {
    assert.equal(
      formatOccupationalDoctorOrg('A.J. Karim', 'VA'),
      'Verzekeringsarts A.J. Karim'
    );
  });

  it('keeps supervisie sentence with full titles', () => {
    const text =
      'Arts L. Bollen werkend onder supervisie van arts T. de Haas';
    assert.equal(formatOccupationalDoctorOrg(text, 'Arts'), text);
  });

  it('expands BA/VA abbreviations in supervisie sentence', () => {
    assert.equal(
      formatOccupationalDoctorOrg(
        'VA P. Mort werkend onder supervisie van BA K. Julien',
        'VA'
      ),
      'Verzekeringsarts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });

  it('does not double-prefix when name already has VA abbreviation', () => {
    assert.equal(
      formatOccupationalDoctorOrg('VA P. Mort', 'VA'),
      'Verzekeringsarts P. Mort'
    );
  });

  it('strips intern gebruik boilerplate', () => {
    assert.equal(
      formatOccupationalDoctorOrg(
        'A.J. Karim, intern gebruik bij arbeidsdeskundige Amplooi',
        'VA'
      ),
      'Verzekeringsarts A.J. Karim'
    );
  });
});

describe('normalizeTp2ExtractedData — doctor fields', () => {
  it('formats bedrijfsarts with role from extraction', () => {
    const result = normalizeTp2ExtractedData({
      occupational_doctor_org: 'A.J. Karim',
      doctor_role: 'VA',
    });

    assert.equal(result.occupational_doctor_org, 'Verzekeringsarts A.J. Karim');
    assert.equal(result.doctor_role, undefined);
  });

  it('preserves supervisie bedrijfsarts text', () => {
    const supervisie =
      'Arts L. Bollen werkend onder supervisie van arts T. de Haas';
    const result = normalizeTp2ExtractedData({
      occupational_doctor_org: supervisie,
      doctor_role: 'Arts',
    });

    assert.equal(result.occupational_doctor_org, supervisie);
  });

  it('expands BA/VA in verbatim supervisie occupational_doctor_org (Hippman leak)', () => {
    const result = normalizeTp2ExtractedData({
      occupational_doctor_org: 'VA P. Mort werkend onder supervisie van BA K. Julien',
      doctor_role: 'VA',
    });

    assert.equal(
      result.occupational_doctor_org,
      'Verzekeringsarts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien'
    );
  });

  it('combines primary Arts and OSV BA into supervisie phrase (Melissa case)', () => {
    const result = normalizeTp2ExtractedData({
      occupational_doctor_org: 'M. Stevens',
      doctor_role: 'Arts',
      osv_doctor_name: 'M. Montagne',
      osv_doctor_role: 'BA',
    });

    assert.equal(
      result.occupational_doctor_org,
      'Arts M. Stevens werkend onder supervisie van Bedrijfsarts M. Montagne'
    );
    assert.equal(result.osv_doctor_name, undefined);
    assert.equal(result.osv_doctor_role, undefined);
  });
});

describe('normalizeTp2ExtractedData — ad_report_concept', () => {
  it('always emits ad_report_concept, defaulting missing/null to false', () => {
    assert.equal(normalizeTp2ExtractedData({}).ad_report_concept, false);
    assert.equal(
      normalizeTp2ExtractedData({ ad_report_concept: null }).ad_report_concept,
      false
    );
    assert.equal(
      normalizeTp2ExtractedData({ ad_report_concept: false }).ad_report_concept,
      false
    );
    assert.equal(
      normalizeTp2ExtractedData({ ad_report_concept: true }).ad_report_concept,
      true
    );
  });

  it('maps legacy intake_concept alias and drops it', () => {
    const result = normalizeTp2ExtractedData({ intake_concept: true });
    assert.equal(result.ad_report_concept, true);
    assert.equal(result.intake_concept, undefined);
  });
});
