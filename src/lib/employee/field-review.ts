import { parseWorkExperience } from '@/lib/utils';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';

export type EmployeeFieldReviewStatus = 'review' | 'validated';
export type EmployeeFieldDisplayStatus = 'empty' | EmployeeFieldReviewStatus;

export type EmployeeDetailFieldKey =
  | 'gender'
  | 'phone'
  | 'date_of_birth'
  | 'current_job'
  | 'work_experience'
  | 'education_level'
  | 'education_name'
  | 'drivers_license'
  | 'drivers_license_type'
  | 'transport_type'
  | 'dutch_speaking'
  | 'dutch_writing'
  | 'dutch_reading'
  | 'has_computer'
  | 'computer_skills'
  | 'contract_hours'
  | 'other_employers';

export const EMPLOYEE_DETAIL_FIELD_KEYS: EmployeeDetailFieldKey[] = [
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
];

const FIELD_KEY_SET = new Set<string>([
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
]);

export function normalizeEmployeeFieldReviewStatus(
  raw: unknown
): Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> {
  if (!raw || typeof raw !== 'object') return {};

  const result: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!FIELD_KEY_SET.has(k)) continue;
    if (v === 'review' || v === 'validated') {
      result[k as EmployeeDetailFieldKey] = v;
    }
  }
  return result;
}

export function normalizeEmployeeFieldContentHash(
  raw: unknown
): Partial<Record<EmployeeDetailFieldKey, string>> {
  if (!raw || typeof raw !== 'object') return {};

  const result: Partial<Record<EmployeeDetailFieldKey, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!FIELD_KEY_SET.has(k)) continue;
    if (typeof v === 'string' && v.trim()) {
      result[k as EmployeeDetailFieldKey] = v;
    }
  }
  return result;
}

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

function normalizeFieldValue(
  field: EmployeeDetailFieldKey,
  value: unknown
): unknown {
  switch (field) {
    case 'phone': {
      if (typeof value !== 'string') return null;
      return normalizePhoneForStorage(value) ?? value.trim();
    }
    case 'work_experience': {
      if (typeof value !== 'string') return null;
      return parseWorkExperience(value);
    }
    case 'transport_type':
    case 'drivers_license_type': {
      return normalizeStringArray(value);
    }
    case 'contract_hours': {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value === 'string') {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    }
    case 'drivers_license':
    case 'has_computer': {
      if (value === null || value === undefined) return null;
      return Boolean(value);
    }
    default: {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') return value.trim();
      return value;
    }
  }
}

export function computeEmployeeFieldHash(
  field: EmployeeDetailFieldKey,
  details: Partial<Record<EmployeeDetailFieldKey, unknown>> | null | undefined
): string {
  const rawValue = details ? details[field] : null;
  const normalized = normalizeFieldValue(field, rawValue);
  return JSON.stringify(normalized);
}

export function getEmployeeFieldDisplayStatus(
  field: EmployeeDetailFieldKey,
  details: Partial<Record<EmployeeDetailFieldKey, unknown>> | null | undefined,
  reviewStatusMap: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> | null | undefined,
  contentHashMap: Partial<Record<EmployeeDetailFieldKey, string>> | null | undefined
): EmployeeFieldDisplayStatus {
  const status = reviewStatusMap?.[field];
  if (!status) return 'empty';

  if (!details) return 'review';
  const currentHash = computeEmployeeFieldHash(field, details);

  if (status === 'validated' && contentHashMap?.[field] === currentHash) {
    return 'validated';
  }

  return 'review';
}

export function applyEmployeeAutofillReviewMarks(
  autofilledFields: EmployeeDetailFieldKey[],
  reviewStatusMap: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> | null | undefined,
  contentHashMap: Partial<Record<EmployeeDetailFieldKey, string>> | null | undefined
): {
  nextReviewStatusMap: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>>;
  nextContentHashMap: Partial<Record<EmployeeDetailFieldKey, string>>;
} {
  const nextReview = { ...(reviewStatusMap || {}) };
  const nextHash = { ...(contentHashMap || {}) };

  for (const field of autofilledFields) {
    nextReview[field] = 'review';
    delete nextHash[field];
  }

  return { nextReviewStatusMap: nextReview, nextContentHashMap: nextHash };
}

