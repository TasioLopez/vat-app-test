import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function numToStr(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

function fillIfEmpty(current: string, next: unknown): string {
  if (current.trim()) return current;
  return str(next);
}

/** Map Dutch title / abbreviation to intake doctor_role enum. */
export function titleToDoctorRole(title: string): string {
  const t = title.trim().toLowerCase();
  if (t === 'arts') return 'Arts';
  if (t === 'anios') return 'Anios';
  if (t === 'aios') return 'Aios';
  if (t === 'ba' || t === 'bedrijfsarts') return 'BA';
  if (t === 'va' || t === 'verzekeringsarts') return 'VA';
  return '';
}

const TITLE_PREFIX_RE =
  /^(Arts|Anios|Aios|Bedrijfsarts|Verzekeringsarts|BA|VA)\b/i;

/** Derive integer age string from YYYY-MM-DD (or DD-MM-YYYY) as of today. */
export function ageFromDateOfBirth(dob: string, now = new Date()): string {
  const raw = dob.trim();
  if (!raw) return '';
  let y: number;
  let m: number;
  let d: number;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const nl = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else if (nl) {
    d = Number(nl[1]);
    m = Number(nl[2]);
    y = Number(nl[3]);
  } else {
    return '';
  }
  if (!y || !m || !d) return '';
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month < m || (month === m && day < d)) age -= 1;
  if (age < 0 || age > 120) return '';
  return String(age);
}

/** Fill doctor_role / osv_* from occupational_doctor_org when missing. */
export function enrichDoctorRolesFromOrg(data: IntakeData, orgRaw: unknown): void {
  if (typeof orgRaw !== 'string' || !orgRaw.trim()) return;
  const org = orgRaw.trim();
  const primaryPart = org.replace(/\s+werkend onder supervisie van.*/i, '').trim();
  const osvMatch = org.match(/\bwerkend onder supervisie van\s+(.+)$/i);
  const osvPart = osvMatch?.[1]?.trim() || '';

  if (!data.s6.occupational_doctor_name) {
    const withoutRole = primaryPart.replace(TITLE_PREFIX_RE, '').trim();
    data.s6.occupational_doctor_name = withoutRole || primaryPart;
  }

  if (!data.s6.doctor_role) {
    const m = primaryPart.match(TITLE_PREFIX_RE);
    if (m) data.s6.doctor_role = titleToDoctorRole(m[1]);
  }

  if (osvPart) {
    if (!data.s6.osv_doctor_name) {
      const withoutRole = osvPart.replace(TITLE_PREFIX_RE, '').trim();
      data.s6.osv_doctor_name = withoutRole || osvPart;
    }
    if (!data.s6.osv_doctor_role) {
      const m = osvPart.match(TITLE_PREFIX_RE);
      if (m) data.s6.osv_doctor_role = titleToDoctorRole(m[1]);
    }
  }
}

/** Merge flat extraction results (core, algemene, tp2, sectie3/5/7, narrative) into IntakeData. */
export function mergeExtractionsIntoIntake(
  base: unknown,
  parts: {
    core?: Record<string, unknown>;
    algemene?: Record<string, unknown>;
    tp2?: Record<string, unknown>;
    sectie3?: Record<string, unknown>;
    sectie5?: Record<string, unknown>;
    sectie7?: Record<string, unknown>;
    narrative?: Record<string, unknown>;
    employeeName?: string;
    employer?: string;
    sourceNotes?: string[];
  }
): IntakeData {
  const data = ensureIntakeShape(base);
  const core = parts.core || {};
  const alg = parts.algemene || {};
  const tp2 = parts.tp2 || {};
  const s3 = parts.sectie3 || {};
  const s5 = parts.sectie5 || {};
  const s7 = parts.sectie7 || {};
  const nar = parts.narrative || {};

  if (parts.employeeName) data.s1.employee_name = fillIfEmpty(data.s1.employee_name, parts.employeeName);
  data.s1.intake_date = fillIfEmpty(data.s1.intake_date, tp2.intake_date);

  data.s2.age = fillIfEmpty(data.s2.age, numToStr(core.age));
  data.s2.gender = fillIfEmpty(data.s2.gender, core.gender);
  data.s2.current_job = fillIfEmpty(data.s2.current_job, core.current_job);
  data.s2.contract_hours = fillIfEmpty(data.s2.contract_hours, numToStr(core.contract_hours));
  data.s2.city = fillIfEmpty(data.s2.city, core.city);
  data.s2.phone = fillIfEmpty(data.s2.phone, core.phone);
  data.s2.email = fillIfEmpty(data.s2.email, core.email);
  data.s2.other_employers = fillIfEmpty(data.s2.other_employers, core.other_employers);
  if (parts.employer) data.s2.employer = fillIfEmpty(data.s2.employer, parts.employer);

  const refFirst = str(core.referent_first_name);
  const refLast = str(core.referent_last_name);
  const refName = [refFirst, refLast].filter(Boolean).join(' ');
  data.s4.referent_name = fillIfEmpty(data.s4.referent_name, refName);
  data.s4.referent_function = fillIfEmpty(data.s4.referent_function, core.referent_function);
  data.s4.referent_phone = fillIfEmpty(data.s4.referent_phone, core.referent_phone);
  data.s4.referent_email = fillIfEmpty(data.s4.referent_email, core.referent_email);

  data.s3.korte_beschrijving_werkzaamheden = fillIfEmpty(
    data.s3.korte_beschrijving_werkzaamheden,
    s3.korte_beschrijving_werkzaamheden
  );

  data.s5.first_sick_day = fillIfEmpty(data.s5.first_sick_day, tp2.first_sick_day);
  data.s5.quote_prognose_advies_belastbaarheid = fillIfEmpty(
    data.s5.quote_prognose_advies_belastbaarheid,
    s5.quote_prognose_advies_belastbaarheid
  );

  data.s6.date_of_birth = fillIfEmpty(data.s6.date_of_birth, core.date_of_birth || tp2.date_of_birth);
  data.s6.registration_date = fillIfEmpty(data.s6.registration_date, tp2.registration_date);
  data.s6.tp_start_date = fillIfEmpty(data.s6.tp_start_date, tp2.tp_start_date);
  data.s6.tp_end_date = fillIfEmpty(data.s6.tp_end_date, tp2.tp_end_date);
  data.s6.fml_izp_lab_date = fillIfEmpty(data.s6.fml_izp_lab_date, tp2.fml_izp_lab_date);
  if (!data.s6.fml_izp_lab_kind && (tp2.fml_izp_lab_kind === 'fml' || tp2.fml_izp_lab_kind === 'izp')) {
    data.s6.fml_izp_lab_kind = tp2.fml_izp_lab_kind;
  }
  data.s6.ad_report_date = fillIfEmpty(data.s6.ad_report_date, tp2.ad_report_date);
  if (typeof tp2.ad_report_concept === 'boolean') data.s6.ad_report_concept = tp2.ad_report_concept;
  if (typeof tp2.is_ex_werknemer === 'boolean') data.s6.is_ex_werknemer = tp2.is_ex_werknemer;
  data.s6.doctor_role = fillIfEmpty(data.s6.doctor_role, tp2.doctor_role);
  data.s6.osv_doctor_role = fillIfEmpty(data.s6.osv_doctor_role, tp2.osv_doctor_role);
  data.s6.osv_doctor_name = fillIfEmpty(data.s6.osv_doctor_name, tp2.osv_doctor_name);
  data.s6.occupational_doctor_ad_name = fillIfEmpty(
    data.s6.occupational_doctor_ad_name,
    tp2.occupational_doctor_name
  );

  enrichDoctorRolesFromOrg(data, tp2.occupational_doctor_org);

  if (!data.s2.age.trim() && data.s6.date_of_birth) {
    data.s2.age = ageFromDateOfBirth(data.s6.date_of_birth);
  }

  data.s7.ad_auteur = fillIfEmpty(data.s7.ad_auteur, s7.ad_auteur);
  data.s7.quote_advies_spoor2 = fillIfEmpty(data.s7.quote_advies_spoor2, s7.quote_advies_spoor2);
  data.s7.quote_passende_functies = fillIfEmpty(
    data.s7.quote_passende_functies,
    s7.quote_passende_functies
  );
  if (Array.isArray(s7.functie_categorien) && s7.functie_categorien.length > 0) {
    data.s7.functie_categorien = s7.functie_categorien as IntakeData['s7']['functie_categorien'];
  }

  // Algemene info → s17
  data.s17.education_level = fillIfEmpty(data.s17.education_level, alg.education_level);
  data.s17.education_name = fillIfEmpty(data.s17.education_name, alg.education_name);
  data.s17.work_experience = fillIfEmpty(data.s17.work_experience, alg.work_experience);
  data.s17.dutch_speaking = fillIfEmpty(data.s17.dutch_speaking, alg.dutch_speaking);
  data.s17.dutch_writing = fillIfEmpty(data.s17.dutch_writing, alg.dutch_writing);
  data.s17.computer_skills = fillIfEmpty(data.s17.computer_skills, alg.computer_skills);
  if (Array.isArray(alg.transport_type) && alg.transport_type.length) {
    data.s17.transport_types = alg.transport_type.map(String);
  } else {
    const transport: string[] = [];
    if (alg.transport_auto === true) transport.push('Auto');
    if (alg.transport_fiets === true) transport.push('Fiets');
    if (alg.transport_ov === true) transport.push('OV');
    if (alg.transport_lopend === true) transport.push('Lopend');
    if (transport.length) data.s17.transport_types = transport;
  }
  if (Array.isArray(alg.drivers_license_type) && alg.drivers_license_type.length) {
    data.s17.drivers_license_types = alg.drivers_license_type.map(String);
  }

  // Narrative sections
  const applyNar = (section: keyof IntakeData, fields: string[]) => {
    const target = data[section] as Record<string, unknown>;
    const src = (nar[section] || nar) as Record<string, unknown>;
    for (const f of fields) {
      if (typeof target[f] === 'string') {
        target[f] = fillIfEmpty(String(target[f]), src[f]);
      }
    }
  };

  applyNar('s5', ['reden_ziekmelding', 'behandeling']);
  if (nar.fml_beperkingen && typeof nar.fml_beperkingen === 'object') {
    const fb = nar.fml_beperkingen as Record<string, unknown>;
    for (const key of Object.keys(data.s5.fml_beperkingen) as (keyof typeof data.s5.fml_beperkingen)[]) {
      if (typeof fb[key] === 'boolean') data.s5.fml_beperkingen[key] = fb[key] as boolean;
    }
  }

  for (const key of [
    'weken',
    'actief_spoor1',
    'eigen_of_aangepast_werk',
    'uren_werkzaam',
    'opbouwschema_aanwezig',
    'wat_lukt_wel_niet',
    'ervaart_belastbaarheid',
    'andere_werkgever',
  ] as const) {
    data.s6[key] = fillIfEmpty(data.s6[key], nar[key] ?? (nar.s6 as Record<string, unknown> | undefined)?.[key]);
  }

  applyNar('s8', ['woonplaats', 'woonsituatie', 'uitwonende_kinderen']);
  applyNar('s9', ['contact_familie', 'hoe_vaak_contact', 'ondersteuning_familie', 'mantelzorg']);
  applyNar('s10', ['zelfstandig_huishouden', 'hulp_huishouden', 'taken_verdeeld']);
  applyNar('s11', ['gemiddelde_dag', 'activiteiten_buitenshuis', 'energie_belastbaarheid']);
  applyNar('s12', ['hobbies', 'leest_of_muziek', 'kan_uitvoeren', 'graag_oppakken']);
  applyNar('s13', ['hoe_lang_werkzaam', 'verbonden_organisatie', 'wens_terugkeer']);
  applyNar('s14', ['houding_spoor2']);
  applyNar('s16', ['interesses_voorkeuren', 'ideeen_passend_werk', 'bereid_scholing', 'graag_ontdekken']);

  data.s17.bijzonderheden = fillIfEmpty(
    data.s17.bijzonderheden,
    nar.bijzonderheden ?? (nar.s17 as Record<string, unknown> | undefined)?.bijzonderheden
  );
  data.s17.praktische_belemmeringen = fillIfEmpty(
    data.s17.praktische_belemmeringen,
    nar.praktische_belemmeringen ??
      (nar.s17 as Record<string, unknown> | undefined)?.praktische_belemmeringen
  );

  if (data.s8.woonplaats === '' && data.s2.city) data.s8.woonplaats = data.s2.city;
  if (data.s2.city === '' && data.s8.woonplaats) data.s2.city = data.s8.woonplaats;

  if (parts.sourceNotes?.length) {
    data.meta.generation_notes = [...data.meta.generation_notes, ...parts.sourceNotes];
  }

  return ensureIntakeShape(data);
}
