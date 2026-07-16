import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTp2ExtractionResult } from '../tp2-extraction-schema';
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
    });
  });
});
