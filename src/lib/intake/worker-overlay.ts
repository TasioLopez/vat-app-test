import { parseContractHours } from '@/lib/employee/contract-hours';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

/** Shared facts that round-trip between the intake form and the worker record. */
const STRING_PATHS: { section: 's1' | 's2' | 's5' | 's6' | 's17'; field: string; key: string }[] = [
  { section: 's2', field: 'gender', key: 'gender' },
  { section: 's2', field: 'phone', key: 'phone' },
  { section: 's2', field: 'email', key: 'email' },
  { section: 's2', field: 'current_job', key: 'current_job' },
  { section: 's2', field: 'other_employers', key: 'other_employers' },
  { section: 's6', field: 'date_of_birth', key: 'date_of_birth' },
  { section: 's17', field: 'education_level', key: 'education_level' },
  { section: 's17', field: 'education_name', key: 'education_name' },
  { section: 's17', field: 'work_experience', key: 'work_experience' },
  { section: 's17', field: 'computer_skills', key: 'computer_skills' },
  { section: 's17', field: 'computer_skills_extra', key: 'computer_skills_description' },
  { section: 's17', field: 'dutch_speaking', key: 'dutch_speaking' },
  { section: 's17', field: 'dutch_writing', key: 'dutch_writing' },
  { section: 's17', field: 'dutch_reading', key: 'dutch_reading' },
  { section: 's5', field: 'first_sick_day', key: 'first_sick_day' },
  { section: 's1', field: 'intake_date', key: 'intake_date' },
  { section: 's6', field: 'registration_date', key: 'registration_date' },
  { section: 's6', field: 'tp_start_date', key: 'tp_start_date' },
  { section: 's6', field: 'tp_end_date', key: 'tp_end_date' },
  { section: 's6', field: 'fml_izp_lab_date', key: 'fml_izp_lab_date' },
  { section: 's6', field: 'ad_report_date', key: 'ad_report_date' },
  { section: 's6', field: 'occupational_doctor_ad_name', key: 'occupational_doctor_name' },
];

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/** Flat shared facts currently shown on the intake form. */
export function intakeSharedFacts(raw: unknown): Record<string, unknown> {
  const data = ensureIntakeShape(raw);
  const drivers = data.s17.drivers_license_types;
  const transport = data.s17.transport_types;
  const facts: Record<string, unknown> = {
    contract_hours: parseContractHours(data.s2.contract_hours),
    is_ex_werknemer: data.s6.is_ex_werknemer,
    drivers_license: drivers.length > 0,
    drivers_license_type: drivers.length > 0 ? drivers : null,
    transport_type: transport.length > 0 ? transport : null,
    has_computer: data.s17.has_pc || Boolean(data.s17.computer_skills),
    ad_report_concept: data.s6.ad_report_concept,
    fml_izp_lab_kind: data.s6.fml_izp_lab_kind || null,
  };
  for (const path of STRING_PATHS) {
    const section = data[path.section] as unknown as Record<string, unknown>;
    const value = section[path.field];
    facts[path.key] = typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  return facts;
}

/** Show the worker record in the intake sections that edit those facts. */
function hasFact(facts: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(facts, key);
}

export function overlayIntakeWithWorkerFacts(raw: unknown, facts: Record<string, unknown>): IntakeData {
  const data = ensureIntakeShape(raw);
  for (const path of STRING_PATHS) {
    if (!hasFact(facts, path.key)) continue;
    const section = data[path.section] as unknown as Record<string, unknown>;
    section[path.field] = asString(facts[path.key]);
  }
  if (hasFact(facts, 'contract_hours')) {
    data.s2.contract_hours =
      facts.contract_hours === null || facts.contract_hours === undefined ? '' : String(facts.contract_hours);
  }
  if (typeof facts.is_ex_werknemer === 'boolean') data.s6.is_ex_werknemer = facts.is_ex_werknemer;
  if (typeof facts.ad_report_concept === 'boolean') data.s6.ad_report_concept = facts.ad_report_concept;
  if (hasFact(facts, 'fml_izp_lab_kind')) {
    data.s6.fml_izp_lab_kind =
      facts.fml_izp_lab_kind === 'fml' || facts.fml_izp_lab_kind === 'izp' ? facts.fml_izp_lab_kind : '';
  }
  if (hasFact(facts, 'drivers_license_type')) {
    data.s17.drivers_license_types = asStringArray(facts.drivers_license_type);
  }
  if (hasFact(facts, 'transport_type')) {
    data.s17.transport_types = asStringArray(facts.transport_type);
  }
  if (hasFact(facts, 'has_computer')) data.s17.has_pc = facts.has_computer === true;
  const name = [facts.first_name, facts.last_name]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ');
  if (name) data.s1.employee_name = name;
  return data;
}

/** Drop shared facts from the stored intake JSON so the worker record stays the only copy. */
export function blankIntakeSharedFacts(raw: unknown): IntakeData {
  const data = overlayIntakeWithWorkerFacts(raw, {
    first_name: null,
    last_name: null,
    gender: null,
    phone: null,
    email: null,
    current_job: null,
    other_employers: null,
    date_of_birth: null,
    education_level: null,
    education_name: null,
    work_experience: null,
    computer_skills: null,
    computer_skills_description: null,
    dutch_speaking: null,
    dutch_writing: null,
    dutch_reading: null,
    first_sick_day: null,
    intake_date: null,
    registration_date: null,
    tp_start_date: null,
    tp_end_date: null,
    fml_izp_lab_date: null,
    fml_izp_lab_kind: null,
    ad_report_date: null,
    occupational_doctor_name: null,
    contract_hours: null,
    drivers_license_type: null,
    transport_type: null,
    has_computer: false,
    is_ex_werknemer: false,
    ad_report_concept: false,
  });
  data.s1.employee_name = '';
  return data;
}
