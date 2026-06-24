import {
  TP2026_PROFIEL_PREVIEW_META,
  TP2026_PROFIEL_WERKNEMER_FIELD_ORDER,
} from '@/lib/tp2026/basis-profiel-field-order';
import {
  COMPUTER_SKILLS_OPTIONS,
  DRIVERS_LICENSE_TYPE_VALUES,
  DUTCH_LANGUAGE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
} from '@/lib/tp2026/gegevens-field-options';
import { parseDateFlexible } from '@/lib/tp2026/trajectory-dates';

export type TP2026FieldType =
  | 'text'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiline'
  | 'multiselect'
  | 'readonly';

export type TP2026FieldDef = {
  key: string;
  label: string;
  type: TP2026FieldType;
  options?: string[];
  placeholder?: string;
};

export const TP2026CoverFields: TP2026FieldDef[] = [
  { key: 'employee_name', label: 'Werknemer naam (weergave)', type: 'readonly' },
  { key: 'first_name', label: 'Voornaam', type: 'text' },
  { key: 'last_name', label: 'Achternaam', type: 'text' },
  { key: 'tp_creation_date', label: 'Datum rapportage', type: 'date' },
  { key: 'client_name', label: 'Opdrachtgever', type: 'text' },
];

export const TP2026GegevensFields: TP2026FieldDef[] = [
  { key: 'gender', label: 'Geslacht', type: 'select', options: ['Man', 'Vrouw'] },
  { key: 'phone', label: 'Telefoon werknemer', type: 'text' },
  { key: 'email', label: 'E-mail werknemer', type: 'text' },
  { key: 'date_of_birth', label: 'Geboortedatum', type: 'date' },
  { key: 'first_sick_day', label: 'Eerste ziektedag', type: 'date' },
  { key: 'registration_date', label: 'Datum aanmelding', type: 'date' },
  { key: 'intake_date', label: 'Datum intakegesprek', type: 'date' },
  { key: 'tp_creation_date', label: 'Datum opmaak trajectplan', type: 'date' },
  { key: 'has_ad_report', label: 'Arbeidsdeskundig rapport aanwezig', type: 'boolean' },
  { key: 'ad_report_date', label: 'Datum AD rapportage', type: 'date' },
  { key: 'occupational_doctor_name', label: 'Arbeidsdeskundige', type: 'text' },
  { key: 'occupational_doctor_org', label: 'Bedrijfsarts', type: 'text' },
  { key: 'fml_izp_lab_date', label: 'Datum FML/IZP/LAB', type: 'date' },
  { key: 'client_referent_name', label: 'Contactpersoon opdrachtgever', type: 'text' },
  { key: 'client_referent_phone', label: 'Telefoon opdrachtgever', type: 'text' },
  { key: 'client_referent_email', label: 'E-mail opdrachtgever', type: 'text' },
  { key: 'current_job', label: 'Huidige functie', type: 'text' },
  { key: 'work_experience', label: 'Werkervaring', type: 'multiline' },
  { key: 'education_level', label: 'Opleidingsniveau', type: 'select', options: [...EDUCATION_LEVEL_OPTIONS] },
  { key: 'education_name', label: 'Specialisatie', type: 'text' },
  { key: 'drivers_license', label: 'Rijbewijs aanwezig', type: 'boolean' },
  { key: 'drivers_license_type', label: 'Rijbewijstype', type: 'multiselect', options: [...DRIVERS_LICENSE_TYPE_VALUES] },
  { key: 'transport_type', label: 'Eigen vervoer', type: 'multiselect', options: [...TRANSPORT_TYPE_OPTIONS] },
  { key: 'dutch_speaking', label: 'Spreekvaardigheid NL-taal', type: 'select', options: [...DUTCH_LANGUAGE_OPTIONS] },
  { key: 'dutch_writing', label: 'Schrijfvaardigheid NL-taal', type: 'select', options: [...DUTCH_LANGUAGE_OPTIONS] },
  { key: 'dutch_reading', label: 'Leesvaardigheid NL-taal', type: 'select', options: [...DUTCH_LANGUAGE_OPTIONS] },
  { key: 'has_computer', label: 'Beschikking over een PC', type: 'boolean' },
  {
    key: 'computer_skills',
    label: 'PC-vaardigheden',
    type: 'select',
    options: COMPUTER_SKILLS_OPTIONS.map((o) => o.value),
  },
  { key: 'contract_hours', label: 'Aantal contracturen per week', type: 'text' },
  { key: 'other_employers', label: 'Andere werkgever(s)', type: 'multiline' },
  { key: 'tp_lead_time', label: 'Doorlooptijd (weken)', type: 'text' },
  { key: 'tp_start_date', label: 'Startdatum', type: 'date' },
  { key: 'tp_end_date', label: 'Einddatum (planning)', type: 'date' },
];

const TP2026_BASIS_INTRO_FIELDS: TP2026FieldDef[] = [
  { key: 'inleiding', label: 'Inleiding', type: 'multiline' },
  { key: 'inleiding_sub', label: 'Toelichting (bij inleiding)', type: 'multiline' },
  { key: 'wettelijke_kaders', label: 'Wettelijke kaders en terminologie', type: 'multiline' },
];

const TP2026_BASIS_PROFIEL_FIELDS: TP2026FieldDef[] = TP2026_PROFIEL_WERKNEMER_FIELD_ORDER.map(
  (key) => ({
    key,
    label: TP2026_PROFIEL_PREVIEW_META[key].editorLabel,
    type: 'multiline' as const,
  })
);

export const TP2026BasisFields: TP2026FieldDef[] = [
  ...TP2026_BASIS_INTRO_FIELDS,
  ...TP2026_BASIS_PROFIEL_FIELDS,
];

export type TP2026Bijlage1Activity = {
  name: string;
  status: 'G' | 'P' | 'N' | 'U';
};

export type TP2026Bijlage1Phase = {
  title: string;
  period_from: string;
  period_to: string;
  activities: TP2026Bijlage1Activity[];
};

export function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function boolToJaNee(value: unknown): string {
  if (value === true) return 'Ja';
  if (value === false) return 'Geen';
  return '—';
}

export function formatNLDate(input?: string | null): string {
  if (!input) return '—';
  const d = parseDateFlexible(String(input));
  if (!d) return '—';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}
