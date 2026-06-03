import type { SupabaseClient } from '@supabase/supabase-js';
import { parseWorkExperience } from '@/lib/utils';

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
  'contract_hours',
  'other_employers',
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
  contract_hours?: number;
  other_employers?: string;
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
  const normalizedWorkExperience = details?.work_experience
    ? parseWorkExperience(details.work_experience)
    : details?.work_experience;

  return buildEmployeeDetailsPayload(
    {
      ...details,
      work_experience: normalizedWorkExperience,
      transport_type: normalizeStringArray(details?.transport_type),
      drivers_license_type: normalizeStringArray(details?.drivers_license_type),
    },
    employeeId
  );
}

export function listAutofilledEmployeeDetailKeys(
  details: Record<string, unknown>
): (keyof EmployeeDetailsPersist)[] {
  return EMPLOYEE_DETAILS_PERSIST_KEYS.filter((key) => {
    if (key === 'autofilled_fields') return false;
    if (!Object.prototype.hasOwnProperty.call(details, key)) return false;
    const v = details[key as keyof typeof details];
    if (key === 'transport_type' && Array.isArray(v) && v.length === 0) return false;
    return v != null && v !== '';
  });
}

export type ApplyEmployeeAutofillResult = {
  updatedDetails: EmployeeDetailsPersist;
  autofilledFields: string[];
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
  const autofilledFields = listAutofilledEmployeeDetailKeys(processed);

  const updatedDetails: EmployeeDetailsPersist = {
    ...(existingDetails || { employee_id: employeeId }),
    ...buildEmployeeDetailsPayload(processed as Partial<EmployeeDetailsPersist>, employeeId),
    employee_id: employeeId,
    autofilled_fields: autofilledFields,
  };

  const { error: persistError } = await supabase
    .from('employee_details')
    .upsert([buildEmployeeDetailsPayload(updatedDetails, employeeId)], {
      onConflict: 'employee_id',
    });

  if (persistError) {
    return {
      updatedDetails,
      autofilledFields,
      error: persistError.message,
    };
  }

  if (processed.gender && typeof processed.gender === 'string') {
    await supabase
      .from('employees')
      .update({ gender: processed.gender })
      .eq('id', employeeId);
  }

  return {
    updatedDetails: normalizeEmployeeDetailsPayload(updatedDetails, employeeId),
    autofilledFields,
    autofillIncomplete: meta?.autofill_incomplete,
    autofillWarnings: meta?.autofill_warnings,
  };
}
