import { INTAKE_DOSSIER_NAV, INTAKE_SECTION_DEFS } from '@/lib/intake/schema';

/** Traject/dossier fields stored on s6 but edited under Dossiergegevens. */
const DOSSIER_FIELDS = new Set([
  'date_of_birth',
  'weken',
  'registration_date',
  'tp_start_date',
  'fml_izp_lab_date',
  'fml_izp_lab_kind',
  'tp_end_date',
  'doctor_role',
  'occupational_doctor_name',
  'ad_report_date',
  'ad_report_concept',
  'osv_doctor_role',
  'osv_doctor_name',
  'occupational_doctor_ad_name',
  'is_ex_werknemer',
]);

const FIELD_LABELS: Record<string, string> = {
  employee_name: 'Naam werknemer',
  intake_date: 'Datum gesprek',
  age: 'Leeftijd werknemer',
  gender: 'Geslacht werknemer',
  current_job: 'Functietitel',
  employer: 'Werkgever/organisatie',
  contract_hours: 'Urenomvang functie (per week)',
  city: 'Woonplaats',
  phone: 'Telefoonnummer werknemer',
  email: 'Email werknemer',
  other_employers: 'Andere werkgever',
  korte_beschrijving_werkzaamheden: 'Korte beschrijving van de werkzaamheden',
  referent_name: 'Naam contactpersoon',
  referent_function: 'Functietitel contactpersoon',
  referent_phone: 'Telefoonnummer contactpersoon',
  referent_email: 'Email contactpersoon',
  extra_referent_name: 'Naam extra contactpersoon',
  extra_referent_function: 'Functie extra contactpersoon',
  first_sick_day: 'Eerste ziektedag',
  reden_ziekmelding: 'Reden ziekmelding',
  quote_prognose_advies_belastbaarheid: 'Quote prognose / advies belastbaarheid',
  behandeling: 'Behandeling',
  date_of_birth: 'Geboortedatum',
  weken: 'Weken',
  registration_date: 'Aanmelddatum',
  tp_start_date: 'Startdatum',
  fml_izp_lab_date: 'Datum FML/IZP',
  fml_izp_lab_kind: 'FML of IZP',
  tp_end_date: 'Einddatum',
  doctor_role: 'Rol arts',
  occupational_doctor_name: 'Naam arts',
  ad_report_date: 'Datum AD-rapport',
  ad_report_concept: 'Concept AD-rapport',
  osv_doctor_role: 'OSV-rol',
  osv_doctor_name: 'Naam OSV',
  occupational_doctor_ad_name: 'Naam AD',
  is_ex_werknemer: 'Ex-werknemer',
  actief_spoor1: 'Actief binnen Spoor 1',
  eigen_of_aangepast_werk: 'Eigen of aangepast werk',
  uren_werkzaam: 'Uren werkzaam',
  opbouwschema_aanwezig: 'Opbouwschema aanwezig',
  wat_lukt_wel_niet: 'Wat lukt wel en niet',
  ervaart_belastbaarheid: 'Ervaart belastbaarheid',
  andere_werkgever: 'Andere werkgever',
  ad_auteur: 'Naam arbeidsdeskundige',
  quote_advies_spoor2: 'Quote advies spoor 2',
  quote_passende_functies: 'Quote passende functies',
  tekst: 'Notitie',
  houding_spoor2: 'Houding t.o.v. deelname aan spoor 2',
  interesses_voorkeuren: 'Interesses of voorkeuren',
  ideeen_passend_werk: 'Ideeën voor passend werk',
  bereid_scholing: 'Bereid tot scholing of omscholing',
  graag_ontdekken: 'Graag ontdekken of leren',
  bijzonderheden: 'Bijzonderheden',
  praktische_belemmeringen: 'Praktische belemmeringen',
  education_level: 'Opleidingsniveau',
  education_name: 'Opleidingsrichting',
  work_experience: 'Werkervaring (functies)',
  computer_skills: 'Computervaardigheden',
  computer_skills_extra: 'Toelichting computervaardigheden',
};

const SECTION_TITLE_BY_KEY = new Map<string, string>([
  [INTAKE_DOSSIER_NAV.key, INTAKE_DOSSIER_NAV.title],
  ...INTAKE_SECTION_DEFS.map((s) => [s.key, s.title] as const),
]);

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ');
}

function fieldLabel(fieldKey: string): string {
  return FIELD_LABELS[fieldKey] || humanizeKey(fieldKey);
}

function sectionTitleFor(sectionKey: string, fieldKey: string): string | null {
  if (sectionKey === 's6' && DOSSIER_FIELDS.has(fieldKey)) {
    return INTAKE_DOSSIER_NAV.title;
  }
  return SECTION_TITLE_BY_KEY.get(sectionKey) ?? null;
}

/** Turn conflict field keys like `s2.employer` into UI labels. */
export function formatIntakeConflictField(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 'Onbekend veld';

  const dot = trimmed.indexOf('.');
  if (dot <= 0) {
    return fieldLabel(trimmed);
  }

  const sectionKey = trimmed.slice(0, dot);
  const fieldKey = trimmed.slice(dot + 1);
  const section = sectionTitleFor(sectionKey, fieldKey);
  const label = fieldLabel(fieldKey);

  if (section) return `${section} — ${label}`;
  return label;
}
