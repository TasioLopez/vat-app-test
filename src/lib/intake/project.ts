import type { IntakeData } from '@/lib/intake/schema';
import { ensureIntakeShape } from '@/lib/intake/schema';
import { parseContractHours } from '@/lib/employee/contract-hours';

function splitReferentName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function buildDoctorOrg(data: IntakeData): string {
  const role = data.s6.doctor_role.trim();
  const name = data.s6.occupational_doctor_name.trim();
  const osvRole = data.s6.osv_doctor_role.trim();
  const osvName = data.s6.osv_doctor_name.trim();
  if (!name && !role) return '';
  const roleTitle =
    role === 'BA'
      ? 'Bedrijfsarts'
      : role === 'VA'
        ? 'Verzekeringsarts'
        : role;
  const primary = [roleTitle, name].filter(Boolean).join(' ').trim();
  if (!osvName) return primary;
  const osvTitle =
    osvRole === 'BA'
      ? 'Bedrijfsarts'
      : osvRole === 'VA'
        ? 'Verzekeringsarts'
        : osvRole;
  const osv = [osvTitle, osvName].filter(Boolean).join(' ').trim();
  return `${primary} werkend onder supervisie van ${osv}`.trim();
}

/** Flat profile + TP2 fields projected from validated intake for employee_details / tp_meta / TP. */
export function intakeToGegevensFields(raw: unknown): Record<string, unknown> {
  const data = ensureIntakeShape(raw);
  const { first: refFirst, last: refLast } = splitReferentName(data.s4.referent_name);
  const hours = parseContractHours(data.s2.contract_hours);

  const drivers = data.s17.drivers_license_types;
  const transport = data.s17.transport_types;

  return {
    gender: data.s2.gender || null,
    phone: data.s2.phone || null,
    email: data.s2.email || null,
    date_of_birth: data.s6.date_of_birth || null,
    current_job: data.s2.current_job || null,
    work_experience: data.s17.work_experience || null,
    education_level: data.s17.education_level || null,
    education_name: data.s17.education_name || null,
    drivers_license: drivers.length > 0,
    drivers_license_type: drivers.length > 0 ? drivers : null,
    transport_type: transport.length > 0 ? transport : null,
    dutch_speaking: data.s17.dutch_speaking || null,
    dutch_writing: data.s17.dutch_writing || null,
    has_computer: data.s17.has_pc || data.s17.computer_skills ? true : null,
    computer_skills: data.s17.computer_skills || null,
    computer_skills_description: data.s17.computer_skills_extra || null,
    contract_hours: hours,
    other_employers: data.s2.other_employers || null,
    is_ex_werknemer: data.s6.is_ex_werknemer,

    intake_date: data.s1.intake_date || null,
    first_sick_day: data.s5.first_sick_day || null,
    registration_date: data.s6.registration_date || null,
    tp_start_date: data.s6.tp_start_date || null,
    tp_end_date: data.s6.tp_end_date || null,
    fml_izp_lab_date: data.s6.fml_izp_lab_date || null,
    fml_izp_lab_kind: data.s6.fml_izp_lab_kind || null,
    ad_report_date: data.s6.ad_report_date || null,
    ad_report_concept: data.s6.ad_report_concept,
    has_ad_report: Boolean(data.s6.ad_report_date || data.s7.ad_auteur || data.s7.quote_advies_spoor2),
    occupational_doctor_name: data.s6.occupational_doctor_ad_name || data.s7.ad_auteur || null,
    occupational_doctor_org: buildDoctorOrg(data) || null,
    doctor_role: data.s6.doctor_role || null,
    osv_doctor_name: data.s6.osv_doctor_name || null,
    osv_doctor_role: data.s6.osv_doctor_role || null,

    client_referent_name: data.s4.referent_name || null,
    client_referent_phone: data.s4.referent_phone || null,
    client_referent_email: data.s4.referent_email || null,
    client_referent_function: data.s4.referent_function || null,
    referent_first_name: refFirst || null,
    referent_last_name: refLast || null,
    referent_function: data.s4.referent_function || null,
    referent_phone: data.s4.referent_phone || null,
    referent_email: data.s4.referent_email || null,

    praktische_belemmeringen: data.s17.praktische_belemmeringen || null,
  };
}

/** Narrative / quote fields used by TP3 when validated intake exists. */
export function intakeToTpNarrativeFields(raw: unknown): Record<string, unknown> {
  const data = ensureIntakeShape(raw);
  return {
    korte_beschrijving_werkzaamheden: data.s3.korte_beschrijving_werkzaamheden || null,
    quote_prognose_advies_belastbaarheid: data.s5.quote_prognose_advies_belastbaarheid || null,
    quote_advies_spoor2: data.s7.quote_advies_spoor2 || null,
    quote_passende_functies: data.s7.quote_passende_functies || null,
    functie_categorien: data.s7.functie_categorien,
    ad_auteur: data.s7.ad_auteur || null,
    bijzonderheden: data.s17.bijzonderheden || null,
    praktische_belemmeringen: data.s17.praktische_belemmeringen || null,
    // Social / visie raw answers for synthesis fallback
    s8: data.s8,
    s9: data.s9,
    s10: data.s10,
    s11: data.s11,
    s12: data.s12,
    s13: data.s13,
    s14: data.s14,
    s16: data.s16,
    s6_narrative: {
      actief_spoor1: data.s6.actief_spoor1,
      eigen_of_aangepast_werk: data.s6.eigen_of_aangepast_werk,
      uren_werkzaam: data.s6.uren_werkzaam,
      opbouwschema_aanwezig: data.s6.opbouwschema_aanwezig,
      wat_lukt_wel_niet: data.s6.wat_lukt_wel_niet,
      ervaart_belastbaarheid: data.s6.ervaart_belastbaarheid,
      andere_werkgever: data.s6.andere_werkgever,
    },
  };
}
