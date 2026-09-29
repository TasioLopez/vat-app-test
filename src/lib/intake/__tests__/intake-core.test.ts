import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createEmptyIntakeData,
  ensureIntakeShape,
  INTAKE_LAYOUT_KEY,
} from '@/lib/intake/schema';
import {
  ageFromDateOfBirth,
  mergeExtractionsIntoIntake,
} from '@/lib/intake/merge-extractions';
import { intakeToGegevensFields } from '@/lib/intake/project';
import { tp3DetailsFromValidatedIntake } from '@/lib/intake/tp-hydrate';
import { isStagingEnv, assertStagingOnly } from '@/lib/auth/staging-only';

describe('intake schema', () => {
  it('ensureIntakeShape fills defaults', () => {
    const shaped = ensureIntakeShape({});
    assert.equal(shaped.meta.form_version, 'perfectview_v4');
    assert.equal(shaped.s2.current_job, '');
    assert.equal(shaped.s5.fml_beperkingen.werktijden, false);
    assert.deepEqual(shaped.s17.transport_types, []);
  });

  it('layout key is intake_v1', () => {
    assert.equal(INTAKE_LAYOUT_KEY, 'intake_v1');
  });
});

describe('mergeExtractionsIntoIntake', () => {
  it('merges core and tp2 into sections', () => {
    const merged = mergeExtractionsIntoIntake(createEmptyIntakeData(), {
      core: {
        current_job: 'Beveiliger',
        gender: 'Man',
        contract_hours: 32,
        referent_first_name: 'D.',
        referent_last_name: 'Viets',
        referent_phone: '0612345678',
      },
      tp2: {
        intake_date: '2026-01-10',
        first_sick_day: '2025-12-01',
        fml_izp_lab_kind: 'fml',
        fml_izp_lab_date: '2026-06-09',
        is_ex_werknemer: true,
      },
      sectie3: {
        korte_beschrijving_werkzaamheden: 'Als Beveiliger is werknemer verantwoordelijk voor toezicht.',
      },
      employeeName: 'Corné Borrèl',
    });

    assert.equal(merged.s1.employee_name, 'Corné Borrèl');
    assert.equal(merged.s1.intake_date, '2026-01-10');
    assert.equal(merged.s2.current_job, 'Beveiliger');
    assert.equal(merged.s2.contract_hours, '32');
    assert.equal(merged.s4.referent_name, 'D. Viets');
    assert.equal(merged.s5.first_sick_day, '2025-12-01');
    assert.equal(merged.s6.fml_izp_lab_kind, 'fml');
    assert.equal(merged.s6.is_ex_werknemer, true);
    assert.match(merged.s3.korte_beschrijving_werkzaamheden, /Als Beveiliger/);
  });

  it('merges Hippman-like age, city, email and doctor roles', () => {
    const merged = mergeExtractionsIntoIntake(createEmptyIntakeData(), {
      core: {
        age: 32,
        gender: 'Vrouw',
        city: 'Amersfoort',
        email: 'Gloria.hippman94@outlook.com',
        date_of_birth: '1994-03-18',
      },
      tp2: {
        doctor_role: 'Arts',
        osv_doctor_role: 'BA',
        osv_doctor_name: 'K. Julien',
        occupational_doctor_org:
          'Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien',
        occupational_doctor_name: 'S. Kowalski',
      },
    });

    assert.equal(merged.s2.age, '32');
    assert.equal(merged.s2.city, 'Amersfoort');
    assert.equal(merged.s2.email, 'Gloria.hippman94@outlook.com');
    assert.equal(merged.s6.doctor_role, 'Arts');
    assert.equal(merged.s6.osv_doctor_role, 'BA');
    assert.equal(merged.s6.osv_doctor_name, 'K. Julien');
    assert.equal(merged.s6.occupational_doctor_name, 'P. Mort');
    assert.equal(merged.s6.occupational_doctor_ad_name, 'S. Kowalski');
  });

  it('derives age from DOB and doctor roles from org when missing', () => {
    const merged = mergeExtractionsIntoIntake(createEmptyIntakeData(), {
      core: { date_of_birth: '1994-03-18' },
      tp2: {
        occupational_doctor_org:
          'Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien',
      },
    });

    assert.equal(merged.s2.age, ageFromDateOfBirth('1994-03-18'));
    assert.equal(merged.s6.doctor_role, 'Arts');
    assert.equal(merged.s6.osv_doctor_role, 'BA');
    assert.equal(merged.s6.occupational_doctor_name, 'P. Mort');
    assert.equal(merged.s6.osv_doctor_name, 'K. Julien');
  });
});

describe('intake project + tp hydrate', () => {
  it('projects gegevens fields', () => {
    const data = createEmptyIntakeData();
    data.s2.gender = 'Man';
    data.s2.current_job = 'Beveiliger';
    data.s2.phone = '0611111111';
    data.s6.date_of_birth = '1992-12-23';
    data.s6.fml_izp_lab_kind = 'fml';
    data.s1.intake_date = '2026-01-10';
    data.s4.referent_name = 'D. Viets';
    data.s4.referent_email = 'a@b.nl';

    const flat = intakeToGegevensFields(data);
    assert.equal(flat.gender, 'Man');
    assert.equal(flat.current_job, 'Beveiliger');
    assert.equal(flat.date_of_birth, '1992-12-23');
    assert.equal(flat.fml_izp_lab_kind, 'fml');
    assert.equal(flat.intake_date, '2026-01-10');
    assert.equal(flat.client_referent_name, 'D. Viets');
  });

  it('tp3DetailsFromValidatedIntake returns inleiding from quotes', () => {
    const data = createEmptyIntakeData();
    data.s3.korte_beschrijving_werkzaamheden = 'Als Beveiliger is werknemer actief.';
    data.s7.quote_advies_spoor2 = 'Spoor 2 is geïndiceerd.';
    const details = tp3DetailsFromValidatedIntake('inleiding', data);
    assert.ok(details);
    assert.equal(details!.inleiding, 'Spoor 2 is geïndiceerd.');
    assert.match(String(details!.inleiding_sub), /Functieomschrijving/);
  });

  it('tp3DetailsFromValidatedIntake returns null when empty', () => {
    const details = tp3DetailsFromValidatedIntake('prognose_bedrijfsarts', createEmptyIntakeData());
    assert.equal(details, null);
  });
});

describe('staging-only gate', () => {
  it('isStagingEnv reflects NEXT_PUBLIC_APP_ENV', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    assert.equal(isStagingEnv(), true);
    assert.equal(assertStagingOnly(), null);
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    assert.equal(isStagingEnv(), false);
    const blocked = assertStagingOnly();
    assert.ok(blocked);
    assert.equal(blocked!.status, 404);
    process.env.NEXT_PUBLIC_APP_ENV = prev;
  });
});
