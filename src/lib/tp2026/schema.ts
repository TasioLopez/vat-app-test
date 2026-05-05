export type TP2026FieldType =
  | 'text'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiline'
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
  { key: 'education_level', label: 'Opleidingsniveau', type: 'text' },
  { key: 'drivers_license', label: 'Rijbewijs aanwezig', type: 'boolean' },
  { key: 'transport_type', label: 'Eigen vervoer', type: 'multiline' },
  { key: 'dutch_speaking', label: 'Spreekvaardigheid NL-taal', type: 'select', options: ['Goed', 'Matig', 'Onvoldoende'] },
  { key: 'dutch_writing', label: 'Schrijfvaardigheid NL-taal', type: 'select', options: ['Goed', 'Matig', 'Onvoldoende'] },
  { key: 'dutch_reading', label: 'Leesvaardigheid NL-taal', type: 'select', options: ['Goed', 'Matig', 'Onvoldoende'] },
  { key: 'has_computer', label: 'Beschikking over een PC', type: 'boolean' },
  { key: 'computer_skills', label: 'PC-vaardigheden', type: 'text' },
  { key: 'contract_hours', label: 'Aantal contracturen per week', type: 'text' },
  { key: 'other_employers', label: 'Andere werkgever(s)', type: 'multiline' },
  { key: 'tp_lead_time', label: 'Doorlooptijd (weken)', type: 'text' },
  { key: 'tp_start_date', label: 'Startdatum', type: 'date' },
  { key: 'tp_end_date', label: 'Einddatum (planning)', type: 'date' },
];

export const TP2026BasisFields: TP2026FieldDef[] = [
  { key: 'inleiding', label: 'Inleiding', type: 'multiline' },
  { key: 'inleiding_sub', label: 'Toelichting (bij inleiding)', type: 'multiline' },
  { key: 'wettelijke_kaders', label: 'Wettelijke kaders en terminologie', type: 'multiline' },
  { key: 'sociale_achtergrond', label: 'Sociale achtergrond & maatschappelijke context', type: 'multiline' },
  { key: 'visie_werknemer', label: 'Visie van werknemer', type: 'multiline' },
  { key: 'visie_loopbaanadviseur', label: 'Visie van loopbaanadviseur', type: 'multiline' },
  { key: 'prognose_bedrijfsarts', label: 'Prognose van de bedrijfsarts', type: 'multiline' },
  { key: 'persoonlijk_profiel', label: 'Persoonlijk profiel', type: 'multiline' },
  { key: 'zoekprofiel', label: 'Zoekprofiel', type: 'multiline' },
  { key: 'praktische_belemmeringen', label: 'Praktische belemmeringen', type: 'multiline' },
  { key: 'advies_ad_passende_arbeid', label: 'Advies passende arbeid (AD)', type: 'multiline' },
  { key: 'pow_meter', label: 'Perspectief op Werk (PoW-meter)', type: 'multiline' },
  { key: 'visie_plaatsbaarheid', label: 'Visie op plaatsbaarheid', type: 'multiline' },
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

export type TP2026BijlageChecklistRow = {
  label: string;
  checked: boolean;
};

export type TP2026Bijlage2Model = {
  willen: TP2026BijlageChecklistRow[];
  weten: TP2026BijlageChecklistRow[];
  kunnen: TP2026BijlageChecklistRow[];
  doen: TP2026BijlageChecklistRow[];
  powTredes: Array<{
    trede: number;
    checks: TP2026BijlageChecklistRow[];
  }>;
};

export type TP2026Bijlage3Decision = {
  question: string;
  yesOutcome: string;
  noOutcome: string;
  reached?: 'yes' | 'no' | null;
};

export function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function boolToJaNee(value: unknown): string {
  if (value === true) return 'Ja';
  if (value === false) return 'Nee';
  return '—';
}

export function formatNLDate(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}
