const FIELD_MAPPING: Record<string, string> = {
  geslacht_werknemer: 'gender',
  geslacht: 'gender',
  leeftijd_werknemer: 'date_of_birth',
  naam_werknemer: 'name',
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

/** Map raw AI JSON to employee_details fields; omit keys instead of inventing defaults. */
export function mapAndValidateEmployeeDetails(
  extractedData: Record<string, unknown>
): Record<string, unknown> {
  const mappedData: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(extractedData)) {
    const mappedKey = FIELD_MAPPING[key] || key;

    if (!VALID_EMPLOYEE_DETAILS_FIELDS.has(mappedKey)) {
      console.log(`⚠️ Skipping field "${mappedKey}" - belongs in tp_meta table, not employee_details`);
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

    if (isPresent(rawValue)) {
      mappedData[mappedKey] = rawValue;
    }
  }

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

  return out;
}
