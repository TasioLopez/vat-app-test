import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import { isAbsentText } from '@/lib/utils';
import { normalizeWorkExperienceTitles } from '@/lib/tp2026/intake-algemene-info';
import { parseContractHours } from '@/lib/employee/contract-hours';
import {
  type EmployeeDetailFieldKey,
  type EmployeeFieldReviewStatus,
} from '@/lib/employee/field-review';
import { saveWorkerFacts, type SkippedValidatedField } from '@/lib/employee/save-worker-facts';

export const EMPLOYEE_DETAILS_PERSIST_KEYS = [
  'gender',
  'phone',
  'date_of_birth',
  'current_job',
  'work_experience',
  'education_level',
  'education_name',
  'drivers_license',
  'drivers_license_type',
  'transport_type',
  'dutch_speaking',
  'dutch_writing',
  'dutch_reading',
  'has_computer',
  'computer_skills',
  'computer_skills_description',
  'contract_hours',
  'other_employers',
  'is_ex_werknemer',
  'field_review_status',
  'field_content_hash',
  'autofilled_fields',
] as const;

export type EmployeeDetailsPersist = {
  employee_id: string;
  gender?: string;
  phone?: string;
  date_of_birth?: string;
  current_job?: string;
  work_experience?: string;
  education_level?: string;
  education_name?: string;
  drivers_license?: boolean;
  drivers_license_type?: string[] | null;
  transport_type?: string[] | null;
  dutch_speaking?: string;
  dutch_writing?: string;
  dutch_reading?: string;
  has_computer?: boolean;
  computer_skills?: string;
  computer_skills_description?: string;
  contract_hours?: number | null;
  other_employers?: string;
  is_ex_werknemer?: boolean;
  field_review_status?: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> | null;
  field_content_hash?: Partial<Record<EmployeeDetailFieldKey, string>> | null;
  autofilled_fields?: string[];
};

function normalizeStringArray(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const clean = value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
    return clean.length > 0 ? [...clean].sort() : null;
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return null;
}

export function processEmployeeAutofillRawDetails(
  rawDetails: Record<string, unknown>
): Record<string, unknown> {
  const processed: Record<string, unknown> = { ...rawDetails };
  if (processed.transport_type) {
    if (!Array.isArray(processed.transport_type)) {
      processed.transport_type =
        typeof processed.transport_type === 'string' ? [processed.transport_type] : [];
    }
  }
  if (processed.drivers_license_type) {
    if (!Array.isArray(processed.drivers_license_type)) {
      processed.drivers_license_type =
        typeof processed.drivers_license_type === 'string'
          ? [processed.drivers_license_type]
          : null;
    }
  }
  if (isAbsentText(processed.other_employers)) {
    delete processed.other_employers;
  }
  return processed;
}

export function buildEmployeeDetailsPayload(
  details: Partial<EmployeeDetailsPersist> | null | undefined,
  employeeId: string
): EmployeeDetailsPersist {
  const filtered = Object.fromEntries(
    EMPLOYEE_DETAILS_PERSIST_KEYS.map((key) => [key, details?.[key]]).filter(
      ([, value]) => value !== undefined
    )
  ) as Partial<EmployeeDetailsPersist>;

  return {
    employee_id: employeeId,
    ...filtered,
  };
}

export function normalizeEmployeeDetailsPayload(
  details: Partial<EmployeeDetailsPersist> | null | undefined,
  employeeId: string
): EmployeeDetailsPersist {
  const normalizedWorkExperience =
    details?.work_experience != null && String(details.work_experience).trim()
      ? normalizeWorkExperienceTitles(
          String(details.work_experience),
          details.current_job != null ? String(details.current_job) : undefined
        ) || undefined
      : details?.work_experience;

  return buildEmployeeDetailsPayload(
    {
      ...details,
      phone: normalizePhoneForStorage(details?.phone) ?? details?.phone,
      work_experience: normalizedWorkExperience,
      transport_type: normalizeStringArray(details?.transport_type),
      drivers_license_type: normalizeStringArray(details?.drivers_license_type),
      contract_hours:
        details?.contract_hours === undefined
          ? undefined
          : parseContractHours(details.contract_hours),
      // Default "Geen" when empty / Nee / etc.; only real employer names stay.
      other_employers: isAbsentText(details?.other_employers)
        ? 'Geen'
        : String(details?.other_employers).trim(),
    },
    employeeId
  );
}

export function listAutofilledEmployeeDetailKeys(
  details: Record<string, unknown>
): (keyof EmployeeDetailsPersist)[] {
  return EMPLOYEE_DETAILS_PERSIST_KEYS.filter((key) => {
    if (key === 'autofilled_fields') return false;
    if (key === 'field_review_status') return false;
    if (key === 'field_content_hash') return false;
    if (!Object.prototype.hasOwnProperty.call(details, key)) return false;
    const v = details[key as keyof typeof details];
    if (key === 'transport_type' && Array.isArray(v) && v.length === 0) return false;
    return v != null && v !== '';
  });
}

export type ApplyEmployeeAutofillResult = {
  updatedDetails: EmployeeDetailsPersist;
  autofilledFields: string[];
  skippedValidated?: SkippedValidatedField[];
  autofillIncomplete?: boolean;
  autofillWarnings?: { message?: string }[];
  error?: string;
};

export async function applyEmployeeAutofillDetails(
  supabase: SupabaseClient,
  employeeId: string,
  existingDetails: Partial<EmployeeDetailsPersist> | null | undefined,
  rawDetails: Record<string, unknown>,
  meta?: {
    autofill_incomplete?: boolean;
    autofill_warnings?: { message?: string }[];
  }
): Promise<ApplyEmployeeAutofillResult> {
  const processed = processEmployeeAutofillRawDetails(rawDetails);
  const saved = await saveWorkerFacts(supabase, employeeId, processed, 'autofill');
  const autofilledFields = saved.written.filter((key) => key !== 'email' && key !== 'first_name' && key !== 'last_name');

  if (!saved.error && autofilledFields.length > 0) {
    await supabase.from('employee_details').upsert(
      [{ employee_id: employeeId, autofilled_fields: autofilledFields }],
      { onConflict: 'employee_id' }
    );
  }

  const mergedValues: Partial<EmployeeDetailsPersist> = {
    ...(existingDetails || { employee_id: employeeId }),
    employee_id: employeeId,
  };
  for (const key of autofilledFields) {
    (mergedValues as Record<string, unknown>)[key] = saved.values[key];
  }
  mergedValues.field_review_status = saved.profileReview;
  mergedValues.field_content_hash = saved.profileHash;
  mergedValues.autofilled_fields = autofilledFields;

  const toPersist = normalizeEmployeeDetailsPayload(mergedValues, employeeId);

  return {
    updatedDetails: toPersist,
    autofilledFields,
    skippedValidated: saved.skippedValidated,
    autofillIncomplete: meta?.autofill_incomplete,
    autofillWarnings: meta?.autofill_warnings,
    error: saved.error,
  };
}
