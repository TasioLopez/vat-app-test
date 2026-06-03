const REFERENT_KEY_MAP: Record<string, string> = {
  first_name: 'referent_first_name',
  last_name: 'referent_last_name',
  function: 'referent_function',
  phone: 'referent_phone',
  email: 'referent_email',
  gender: 'referent_gender',
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
  // "key": with no value before } or ]
  s = s.replace(/"([^"\\]+)"\s*:\s*(?=[}\]])/g, '"$1": null');
  // "key": at end of string (truncated)
  s = s.replace(/"([^"\\]+)"\s*:\s*$/g, '"$1": null');
  return s;
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

export function parseJsonFromAssistant(responseText: string): Record<string, unknown> {
  if (!responseText || typeof responseText !== 'string') {
    console.warn('⚠️ Empty or invalid response text');
    return {};
  }

  let cleanedResponse = responseText.trim();
  cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const firstBrace = cleanedResponse.indexOf('{');
  if (firstBrace === -1) {
    console.warn('⚠️ No JSON object found in response. Response preview:', cleanedResponse.substring(0, 200));
    return {};
  }

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

  if (lastBrace === -1) {
    console.warn('⚠️ No matching closing brace found. Response preview:', cleanedResponse.substring(0, 200));
    return {};
  }

  cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);

  const parsed = tryParseJsonObject(cleanedResponse);
  if (parsed) return parsed;

  console.warn('⚠️ JSON parsing error: could not parse assistant response');
  console.warn('📄 Attempted to parse:', cleanedResponse.substring(0, 200));
  return {};
}
