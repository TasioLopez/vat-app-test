/** Employee profile fields on step 2 filled by `/api/autofill-employee-info-working`. */
export const GEGEVENS_EMPLOYEE_KEYS = [
  'gender',
  'phone',
  'email',
  'date_of_birth',
  'current_job',
  'work_experience',
  'education_level',
  'drivers_license',
  'drivers_license_type',
  'transport_type',
  'dutch_speaking',
  'dutch_writing',
  'dutch_reading',
  'has_computer',
  'computer_skills',
  'contract_hours',
  'other_employers',
] as const;

/** TP metadata fields on step 2 filled by `/api/autofill-tp-2`. */
export const GEGEVENS_TP2_KEYS = [
  'first_sick_day',
  'registration_date',
  'intake_date',
  'tp_creation_date',
  'has_ad_report',
  'ad_report_date',
  'occupational_doctor_name',
  'occupational_doctor_org',
  'fml_izp_lab_date',
  'tp_lead_time',
  'tp_start_date',
  'tp_end_date',
] as const;

export const GEGEVENS_REFERENT_KEYS = [
  'client_referent_name',
  'client_referent_phone',
  'client_referent_email',
  'client_referent_function',
] as const;

export type GegevensEmployeeKey = (typeof GEGEVENS_EMPLOYEE_KEYS)[number];
export type GegevensTp2Key = (typeof GEGEVENS_TP2_KEYS)[number];

export function isEmptyGegevensField(key: string, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/** Merge source into target only where target field is empty (hydrate must not clobber data_json). */
export function mergeRecordFillBlanks(
  target: Record<string, unknown>,
  source: Record<string, unknown> | null | undefined,
  keys?: readonly string[]
): Record<string, unknown> {
  if (!source) return target;
  const next = { ...target };
  const keyList = keys ?? Object.keys(source);
  for (const key of keyList) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const incoming = source[key];
    if (isEmptyGegevensField(key, next[key]) && !isEmptyGegevensField(key, incoming)) {
      next[key] = incoming;
    }
  }
  return next;
}

export function getGegevensAutofillPlan(data: Record<string, unknown>): {
  runEmployee: boolean;
  runTp2: boolean;
} {
  const runEmployee = GEGEVENS_EMPLOYEE_KEYS.some((key) =>
    isEmptyGegevensField(key, data[key])
  );
  const runTp2 = GEGEVENS_TP2_KEYS.some((key) => isEmptyGegevensField(key, data[key]));
  return { runEmployee, runTp2 };
}

export function mergeGegevensAutofill(
  current: Record<string, unknown>,
  payload: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const next = { ...current };
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    const incoming = payload[key];
    if (isEmptyGegevensField(key, incoming)) continue;
    if (isEmptyGegevensField(key, next[key])) {
      next[key] = incoming;
    }
  }
  return next;
}

export type SuggestedReferent = {
  first_name?: string;
  last_name?: string;
  referent_function?: string;
  phone?: string;
  email?: string;
  gender?: string;
};

export function applySuggestedReferentToTpData(
  current: Record<string, unknown>,
  suggested: SuggestedReferent | null | undefined
): Record<string, unknown> {
  if (!suggested) return current;
  const next = { ...current };
  const fullName = [suggested.first_name, suggested.last_name].filter(Boolean).join(' ').trim();
  if (fullName && isEmptyGegevensField('client_referent_name', next.client_referent_name)) {
    next.client_referent_name = fullName;
  }
  if (suggested.phone && isEmptyGegevensField('client_referent_phone', next.client_referent_phone)) {
    next.client_referent_phone = suggested.phone;
  }
  if (suggested.email && isEmptyGegevensField('client_referent_email', next.client_referent_email)) {
    next.client_referent_email = suggested.email;
  }
  if (
    suggested.referent_function &&
    isEmptyGegevensField('client_referent_function', next.client_referent_function)
  ) {
    next.client_referent_function = suggested.referent_function;
  }
  return next;
}
