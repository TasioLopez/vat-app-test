import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getGegevensAutofillPlan } from '@/lib/tp2026/gegevens-autofill';
import { buildAutofillSteps } from '@/lib/tp2026/autofill-runner';

describe('getGegevensAutofillPlan', () => {
  it('always runs employee and tp2 even when all fields are filled', () => {
    const plan = getGegevensAutofillPlan({
      gender: 'Vrouw',
      phone: '06',
      email: 'a@b.nl',
      date_of_birth: '1994-03-18',
      current_job: 'Logistiek Coördinator',
      work_experience: 'Planner',
      education_level: 'MBO 4',
      education_name: 'Logistiek',
      drivers_license: true,
      drivers_license_type: ['B'],
      transport_type: ['Auto'],
      dutch_speaking: 'Goed',
      dutch_writing: 'Goed',
      dutch_reading: 'Goed',
      has_computer: true,
      computer_skills: '4',
      contract_hours: 32,
      other_employers: '',
      first_sick_day: '2025-07-20',
      registration_date: '2026-07-07',
      intake_date: '2026-07-14',
      tp_creation_date: '2026-07-16',
      has_ad_report: false,
      ad_report_concept: true,
      ad_report_date: '2026-06-27',
      occupational_doctor_name: 'S. Kowalski',
      occupational_doctor_org: 'P. Mort',
      fml_izp_lab_date: '2026-06-09',
      tp_lead_time: 12,
      tp_start_date: '2026-07-14',
      tp_end_date: '2027-07-20',
    });
    assert.equal(plan.runEmployee, true);
    assert.equal(plan.runTp2, true);
  });
});

describe('buildAutofillSteps current_step 2', () => {
  it('schedules employee and tp2 when gegevens are already filled', () => {
    const steps = buildAutofillSteps('current_step', 2, {
      gender: 'Vrouw',
      has_ad_report: false,
      ad_report_concept: true,
      first_sick_day: '2025-07-20',
      transport_type: ['Auto'],
      drivers_license_type: ['B'],
    });
    assert.deepEqual(
      steps.map((s) => s.id),
      ['employee', 'tp2']
    );
  });
});
