import { formatDutchPhoneDisplay } from '@/lib/phone/format-dutch-display';
import {
  normalizeEducationLevel,
  repairEmployeeEducationFields,
} from '@/lib/tp2026/gegevens-field-options';

const FIELD_MAPPING: Record<string, string> = {
  geslacht_werknemer: 'gender',
  geslacht: 'gender',
  leeftijd_werknemer: 'date_of_birth',
  naam_werknemer: 'name',
  telefoon: 'phone',
  telefoonnummer: 'phone',
  telefoonnummer_werknemer: 'phone',
};

const VALID_EMPLOYEE_DETAILS_FIELDS = new Set([
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
  'gender',
  'date_of_birth',
  'phone',
]);

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function normalizeDutchLevel(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  const lower = s.toLowerCase();
  if (lower === 'g' || lower === 'goed') return 'Goed';
  if (lower === 'r' || lower === 'redelijk' || lower === 'gemiddeld') return 'Gemiddeld';
  if (lower === 'o' || lower === 'onvoldoende' || lower === 's' || lower === 'slecht' || lower === 'niet goed') {
    return 'Niet goed';
  }
  if (s === 'Goed' || s === 'Gemiddeld' || s === 'Niet goed') return s;
  return undefined;
}

/** Split "Naam contactpersoon" into first/last (last token = achternaam). */
export function splitContactPersonName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: '', last_name: parts[0] };
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
}

function normalizeReferentPhone(value: unknown): string | undefined {
  if (!isPresent(value)) return undefined;
  return formatDutchPhoneDisplay(String(value));
}

function isLikelyWrongReferent(out: Record<string, unknown>): boolean {
  const fn = String(out.referent_function ?? '').toLowerCase();
  const hasContact = isPresent(out.referent_phone) || isPresent(out.referent_email);
  if (hasContact) return false;
  return fn.includes('arbeidsdeskundig') || fn.includes('bedrijfsarts');
}

/** Map raw AI JSON to employee_details fields; omit keys instead of inventing defaults. */
export function mapAndValidateEmployeeDetails(
  extractedData: Record<string, unknown>
): Record<string, unknown> {
  const mappedData: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(extractedData)) {
    const mappedKey = FIELD_MAPPING[key] || key;

    if (!VALID_EMPLOYEE_DETAILS_FIELDS.has(mappedKey)) {
      if (!mappedKey.startsWith('referent_')) {
        console.log(`⚠️ Skipping field "${mappedKey}" - not an employee_details field`);
      }
      continue;
    }

    if (mappedKey === 'date_of_birth' && typeof rawValue === 'number') {
      console.log('⚠️ Skipping age number, expecting date format for date_of_birth');
      continue;
    }

    if (rawValue == null) continue;

    if (mappedKey === 'contract_hours') {
      if (typeof rawValue === 'string') {
        const normalizedValue = rawValue.replace(',', '.');
        const numValue = parseFloat(normalizedValue);
        if (!isNaN(numValue)) {
          mappedData[mappedKey] = numValue;
        }
      } else if (typeof rawValue === 'number' && !isNaN(rawValue)) {
        mappedData[mappedKey] = rawValue;
      }
      continue;
    }

    if (mappedKey === 'transport_type') {
      if (Array.isArray(rawValue) && rawValue.length > 0) {
        mappedData[mappedKey] = rawValue.map((v) => String(v).trim()).filter(Boolean);
      } else if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
        mappedData[mappedKey] = [rawValue.trim()];
      }
      continue;
    }

    if (mappedKey === 'drivers_license') {
      if (typeof rawValue === 'boolean') {
        mappedData[mappedKey] = rawValue;
      } else if (typeof rawValue === 'string') {
        const s = rawValue.toLowerCase().trim();
        if (s === 'ja' || s === 'yes' || s === 'true' || s === '1') mappedData[mappedKey] = true;
        else if (s === 'nee' || s === 'no' || s === 'false' || s === '0') mappedData[mappedKey] = false;
      }
      continue;
    }

    if (mappedKey === 'drivers_license_type') {
      if (Array.isArray(rawValue) && rawValue.length > 0) {
        mappedData[mappedKey] = rawValue.map((v) => String(v).trim()).filter(Boolean);
      } else if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
        mappedData[mappedKey] = rawValue.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      }
      continue;
    }

    if (mappedKey === 'dutch_speaking' || mappedKey === 'dutch_writing' || mappedKey === 'dutch_reading') {
      const level = normalizeDutchLevel(rawValue);
      if (level) mappedData[mappedKey] = level;
      continue;
    }

    if (mappedKey === 'has_computer') {
      if (typeof rawValue === 'boolean') mappedData[mappedKey] = rawValue;
      else if (typeof rawValue === 'string') {
        const s = rawValue.toLowerCase().trim();
        if (s === 'ja' || s === 'true' || s === '1') mappedData[mappedKey] = true;
        else if (s === 'nee' || s === 'false' || s === '0') mappedData[mappedKey] = false;
      }
      continue;
    }

    if (mappedKey === 'computer_skills') {
      const n = typeof rawValue === 'number' ? rawValue : parseInt(String(rawValue), 10);
      if (!isNaN(n) && n >= 1 && n <= 5) mappedData[mappedKey] = String(n);
      continue;
    }

    if (mappedKey === 'phone') {
      const formatted = normalizeReferentPhone(rawValue);
      if (formatted) mappedData[mappedKey] = formatted;
      continue;
    }

    if (mappedKey === 'education_level') {
      const level = normalizeEducationLevel(rawValue);
      if (level) mappedData[mappedKey] = level;
      continue;
    }

    if (mappedKey === 'education_name') {
      if (isPresent(rawValue)) {
        mappedData[mappedKey] = String(rawValue).trim();
      }
      continue;
    }

    if (isPresent(rawValue)) {
      mappedData[mappedKey] = rawValue;
    }
  }

  const repaired = repairEmployeeEducationFields(
    mappedData.education_level,
    mappedData.education_name
  );
  if (repaired.education_level) mappedData.education_level = repaired.education_level;
  else delete mappedData.education_level;
  if (repaired.education_name) mappedData.education_name = repaired.education_name;
  else delete mappedData.education_name;

  return mappedData;
}

const REFERENT_KEYS = [
  'referent_first_name',
  'referent_last_name',
  'referent_function',
  'referent_phone',
  'referent_email',
  'referent_gender',
] as const;

const FULL_NAME_KEYS = ['naam_contactpersoon', 'referent_name', 'contactpersoon_naam'] as const;

/** Referent fields stripped from details but kept for suggested_referent. */
export function extractReferentFromRaw(
  extractedData: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of REFERENT_KEYS) {
    if (extractedData[k] != null && extractedData[k] !== '') out[k] = extractedData[k];
  }

  const nested = extractedData.referent;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const map: Record<string, string> = {
      first_name: 'referent_first_name',
      last_name: 'referent_last_name',
      function: 'referent_function',
      phone: 'referent_phone',
      email: 'referent_email',
      gender: 'referent_gender',
    };
    for (const [key, value] of Object.entries(nested as Record<string, unknown>)) {
      if (value == null || value === '') continue;
      const target = map[key] || (key.startsWith('referent_') ? key : null);
      if (target && out[target] == null) out[target] = value;
    }
  }

  if (!out.referent_first_name && !out.referent_last_name) {
    for (const key of FULL_NAME_KEYS) {
      const raw = extractedData[key];
      if (typeof raw === 'string' && raw.trim()) {
        const split = splitContactPersonName(raw);
        if (split.first_name) out.referent_first_name = split.first_name;
        if (split.last_name) out.referent_last_name = split.last_name;
        break;
      }
    }
  }

  if (out.referent_phone != null && out.referent_phone !== '') {
    const formatted = normalizeReferentPhone(out.referent_phone);
    if (formatted) out.referent_phone = formatted;
  }

  if (isLikelyWrongReferent(out)) {
    return {};
  }

  return out;
}

/** Merge referent fields; existing non-empty values win. */
export function mergeReferentFields(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...target };
  for (const k of REFERENT_KEYS) {
    const incoming = source[k];
    const current = out[k];
    if (
      incoming != null &&
      incoming !== '' &&
      (current == null || current === '')
    ) {
      out[k] = incoming;
    }
  }
  return out;
}
