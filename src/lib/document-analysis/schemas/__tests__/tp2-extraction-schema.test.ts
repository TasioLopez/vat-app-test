import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTp2ExtractionResult,
  validateTp2DoctorExtraction,
} from '../tp2-extraction-schema';
import { parseAdReportDateResult, parseFmlIzpDateResult } from '../tp2-date-schema';

describe('parseTp2ExtractionResult', () => {
  it('keeps date and doctor fields, drops nulls', () => {
    const result = parseTp2ExtractionResult({
      intake_date: '2026-06-05',
      ad_report_concept: true,
      osv_doctor_name: 'M. Montagne',
      osv_doctor_role: 'BA',
      doctor_role: null,
      tp_end_date: '',
    });

    assert.equal(result.intake_date, '2026-06-05');
    assert.equal(result.ad_report_concept, true);
    assert.equal(result.osv_doctor_name, 'M. Montagne');
    assert.equal(result.osv_doctor_role, 'BA');
    assert.equal('doctor_role' in result, false);
    assert.equal('tp_end_date' in result, false);
  });

  it('defaults ad_report_concept to false when absent or null', () => {
    assert.equal(parseTp2ExtractionResult({}).ad_report_concept, false);
    assert.equal(
      parseTp2ExtractionResult({ ad_report_concept: null }).ad_report_concept,
      false
    );
  });

  it('keeps explicit false for ad_report_concept', () => {
    assert.equal(
      parseTp2ExtractionResult({ ad_report_concept: false }).ad_report_concept,
      false
    );
  });

  it('defaults is_ex_werknemer to false when absent or null', () => {
    assert.equal(parseTp2ExtractionResult({}).is_ex_werknemer, false);
    assert.equal(parseTp2ExtractionResult({ is_ex_werknemer: null }).is_ex_werknemer, false);
  });

  it('keeps explicit true for is_ex_werknemer', () => {
    assert.equal(parseTp2ExtractionResult({ is_ex_werknemer: true }).is_ex_werknemer, true);
  });

  it('keeps Aios doctor_role and osv_doctor_role', () => {
    const result = parseTp2ExtractionResult({
      doctor_role: 'Aios',
      osv_doctor_role: 'Aios',
      osv_doctor_name: 'K. Julien',
      occupational_doctor_org: 'J. de Vries',
    });
    assert.equal(result.doctor_role, 'Aios');
    assert.equal(result.osv_doctor_role, 'Aios');
    assert.equal(result.osv_doctor_name, 'K. Julien');
  });

  it('keeps fml_izp_lab_kind from intake checkboxes', () => {
    const result = parseTp2ExtractionResult({
      fml_izp_lab_date: '2026-06-09',
      fml_izp_lab_kind: 'fml',
    });
    assert.equal(result.fml_izp_lab_date, '2026-06-09');
    assert.equal(result.fml_izp_lab_kind, 'fml');
  });
});

describe('validateTp2DoctorExtraction', () => {
  it('fails when supervisie phrase has bare primary and no doctor_role (Hippman)', () => {
    const result = validateTp2DoctorExtraction({
      occupational_doctor_org: 'P. Mort werkend onder supervisie van Bedrijfsarts K. Julien',
      doctor_role: null,
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0] || '', /doctor_role/i);
  });

  it('fails when osv_doctor_name set but doctor_role and primary title missing', () => {
    const result = validateTp2DoctorExtraction({
      occupational_doctor_org: 'P. Mort',
      osv_doctor_name: 'K. Julien',
      osv_doctor_role: 'BA',
    });
    assert.equal(result.ok, false);
  });

  it('fails when doctor_role Arts but primary lacks Arts prefix', () => {
    const result = validateTp2DoctorExtraction({
      occupational_doctor_org: 'P. Mort werkend onder supervisie van Bedrijfsarts K. Julien',
      doctor_role: 'Arts',
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0] || '', /Arts/i);
  });

  it('passes Hippman-correct titled phrase with roles', () => {
    const result = validateTp2DoctorExtraction({
      occupational_doctor_org:
        'Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien',
      doctor_role: 'Arts',
      osv_doctor_name: 'K. Julien',
      osv_doctor_role: 'BA',
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  });

  it('passes VA-only with matching title', () => {
    const result = validateTp2DoctorExtraction({
      occupational_doctor_org: 'Verzekeringsarts A.J. Karim',
      doctor_role: 'VA',
    });
    assert.equal(result.ok, true);
  });
});

describe('parseAdReportDateResult', () => {
  it('returns null when date missing', () => {
    assert.deepEqual(parseAdReportDateResult({ ad_report_date: null }), {
      ad_report_date: null,
    });
  });

  it('trims date string', () => {
    assert.deepEqual(parseAdReportDateResult({ ad_report_date: ' 2026-02-02 ' }), {
      ad_report_date: '2026-02-02',
    });
  });
});

describe('parseFmlIzpDateResult', () => {
  it('returns parsed fml date', () => {
    assert.deepEqual(parseFmlIzpDateResult({ fml_izp_lab_date: '2026-01-19' }), {
      fml_izp_lab_date: '2026-01-19',
      fml_izp_lab_kind: null,
    });
  });

  it('returns date and kind together', () => {
    assert.deepEqual(
      parseFmlIzpDateResult({ fml_izp_lab_date: '2026-06-09', fml_izp_lab_kind: 'fml' }),
      {
        fml_izp_lab_date: '2026-06-09',
        fml_izp_lab_kind: 'fml',
      }
    );
  });

  it('normalizes uppercase kind', () => {
    assert.deepEqual(
      parseFmlIzpDateResult({ fml_izp_lab_date: '2026-06-09', fml_izp_lab_kind: 'IZP' }),
      {
        fml_izp_lab_date: '2026-06-09',
        fml_izp_lab_kind: 'izp',
      }
    );
  });
});
