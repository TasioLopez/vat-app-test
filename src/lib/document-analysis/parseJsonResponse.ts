import { stripAssistantArtifacts } from './stripAssistantArtifacts';

const REFERENT_KEY_MAP: Record<string, string> = {
  first_name: 'referent_first_name',
  last_name: 'referent_last_name',
  function: 'referent_function',
  phone: 'referent_phone',
  email: 'referent_email',
  gender: 'referent_gender',
};

/** Map Dutch / markdown label fragments to JSON keys. */
const MARKDOWN_LABEL_MAP: Record<string, string> = {
  current_job: 'current_job',
  contract_hours: 'contract_hours',
  date_of_birth: 'date_of_birth',
  gender: 'gender',
  geslacht: 'gender',
  geslacht_werknemer: 'gender',
  phone: 'phone',
  telefoon: 'phone',
  telefoonnummer: 'phone',
  telefoonnummer_werknemer: 'phone',
  work_experience: 'work_experience',
  education_level: 'education_level',
  education_name: 'education_name',
  other_employers: 'other_employers',
  transport_type: 'transport_type',
  drivers_license: 'drivers_license',
  drivers_license_type: 'drivers_license_type',
  dutch_speaking: 'dutch_speaking',
  dutch_writing: 'dutch_writing',
  dutch_reading: 'dutch_reading',
  has_computer: 'has_computer',
  computer_skills: 'computer_skills',
  referent_first_name: 'referent_first_name',
  referent_last_name: 'referent_last_name',
  referent_function: 'referent_function',
  referent_phone: 'referent_phone',
  referent_email: 'referent_email',
  referent_gender: 'referent_gender',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Unwrap nested employee_details / referent wrappers from model output. */
export function flattenExtractionPayload(parsed: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...parsed };

  const details = parsed.employee_details;
  if (isPlainObject(details)) {
    for (const [key, value] of Object.entries(details)) {
      if (value !== undefined && value !== null) {
        out[key] = value;
      }
    }
    delete out.employee_details;
  }

  const referent = parsed.referent;
  if (isPlainObject(referent)) {
    for (const [key, value] of Object.entries(referent)) {
      if (value === undefined || value === null) continue;
      const mappedKey = REFERENT_KEY_MAP[key] || (key.startsWith('referent_') ? key : null);
      if (mappedKey) out[mappedKey] = value;
    }
    delete out.referent;
  }

  return out;
}

/** Fix common invalid JSON from LLMs (trailing commas, missing values). */
export function repairJsonString(json: string): string {
  let s = json.trim();
  s = s.replace(/,(\s*[}\]])/g, '$1');
  s = s.replace(/"([^"\\]+)"\s*:\s*(?=[}\]])/g, '"$1": null');
  s = s.replace(/"([^"\\]+)"\s*:\s*$/g, '"$1": null');
  return s;
}

function normalizeMarkdownLabel(label: string): string {
  return label
    .replace(/【[^】]+】/g, '')
    .replace(/\*\*/g, '')
    .trim()
    .replace(/:$/, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function coerceMarkdownValue(key: string, raw: string): unknown {
  const value = stripAssistantArtifacts(raw).trim();
  if (!value) return undefined;

  if (key === 'contract_hours') {
    const num = parseFloat(value.replace(',', '.'));
    return Number.isNaN(num) ? undefined : num;
  }

  if (key === 'drivers_license' || key === 'has_computer') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === 'ja' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'nee' || lower === 'no' || lower === '0') return false;
    return undefined;
  }

  if (key === 'transport_type' || key === 'drivers_license_type') {
    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fall through
      }
    }
    return value.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  return value;
}

/**
 * Parse markdown bullet lists like `- **current_job**: Supervisor` into a flat record.
 */
export function parseMarkdownFieldList(text: string): Record<string, unknown> {
  if (!text?.trim()) return {};

  const out: Record<string, unknown> = {};
  const linePattern = /^[\s\-•]+(?:\*\*)?([^:*\n]+?)(?:\*\*)?\s*:\s*(.+)$/;

  for (const line of text.split('\n')) {
    const match = line.match(linePattern);
    if (!match) continue;

    const normalizedLabel = normalizeMarkdownLabel(match[1]);
    const mappedKey =
      MARKDOWN_LABEL_MAP[normalizedLabel] ||
      MARKDOWN_LABEL_MAP[normalizedLabel.replace(/_werknemer$/, '')] ||
      (normalizedLabel in MARKDOWN_LABEL_MAP ? MARKDOWN_LABEL_MAP[normalizedLabel] : null);

    if (!mappedKey) continue;

    const coerced = coerceMarkdownValue(mappedKey, match[2]);
    if (coerced !== undefined && coerced !== null && coerced !== '') {
      out[mappedKey] = coerced;
    }
  }

  return out;
}

function tryParseJsonObject(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return flattenExtractionPayload(parsed as Record<string, unknown>);
    }
  } catch {
    // retry after repair
  }
  try {
    const parsed = JSON.parse(repairJsonString(json));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return flattenExtractionPayload(parsed as Record<string, unknown>);
    }
  } catch {
    return null;
  }
  return null;
}

function isEmptyRecord(record: Record<string, unknown>): boolean {
  return Object.keys(record).length === 0;
}

export function parseJsonFromAssistant(responseText: string): Record<string, unknown> {
  if (!responseText || typeof responseText !== 'string') {
    console.warn('⚠️ Empty or invalid response text');
    return {};
  }

  let cleanedResponse = responseText.trim();
  cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const firstBrace = cleanedResponse.indexOf('{');
  if (firstBrace !== -1) {
    let braceCount = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < cleanedResponse.length; i++) {
      if (cleanedResponse[i] === '{') braceCount++;
      if (cleanedResponse[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBrace = i;
          break;
        }
      }
    }

    if (lastBrace !== -1) {
      const jsonSlice = cleanedResponse.substring(firstBrace, lastBrace + 1);
      const parsed = tryParseJsonObject(jsonSlice);
      if (parsed && !isEmptyRecord(parsed)) return parsed;
    }
  }

  const markdownParsed = parseMarkdownFieldList(cleanedResponse);
  if (!isEmptyRecord(markdownParsed)) {
    console.warn('⚠️ Recovered fields from markdown list response');
    return markdownParsed;
  }

  if (firstBrace === -1) {
    console.warn('⚠️ No JSON object found in response. Response preview:', cleanedResponse.substring(0, 200));
  } else {
    console.warn('⚠️ JSON parsing error: could not parse assistant response');
    console.warn('📄 Attempted to parse:', cleanedResponse.substring(0, 200));
  }

  return {};
}
