import {
  DRIVERS_LICENSE_TYPE_OPTIONS,
  DRIVERS_LICENSE_TYPE_VALUES,
  TRANSPORT_TYPE_OPTIONS,
} from '@/lib/tp2026/gegevens-field-options';
import {
  applyExWerknemerFromText,
  detectExWerknemerFromText,
} from '@/lib/tp/ex-werknemer-wording';

const CHECKED = String.raw`[☒☑✓✔]|\[(?:x|X)\]|\((?:x|X)\)`;
const UNCHECKED = String.raw`[☐□]|\[\s*\]|\(\s*\)`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeIntakeText(text: string): string {
  return text.replace(/\u00a0/g, ' ');
}

/** Longer codes first so BE/C1E match before B/C1. */
function licenseValuesLongestFirst(): string[] {
  return [...DRIVERS_LICENSE_TYPE_VALUES]
    .filter((v) => v !== 'E')
    .sort((a, b) => b.length - a.length);
}

function licenseLabelPattern(value: string): string {
  if (value === 'B+') {
    return String.raw`(?:B\+|B\s*\+\s*\(?Code\s*96\)?|Code\s*96)`;
  }
  if (value === 'Code 95') {
    return String.raw`Code\s*95`;
  }
  // Avoid B matching BE: require end of category token
  return `${escapeRegExp(value)}(?![A-Za-z0-9+])`;
}

/**
 * Detect checked rijbewijs categories from intake plain text.
 * Returns null when no clear checkbox glyphs are found next to license labels.
 */
export function detectDriversLicenseFromIntakeText(
  text: string | null | undefined
): string[] | null {
  if (!text) return null;
  const normalized = normalizeIntakeText(text);
  const found: string[] = [];
  let sawAnyGlyph = false;

  for (const value of licenseValuesLongestFirst()) {
    const label = licenseLabelPattern(value);
    const checkedRe = new RegExp(`(?:${CHECKED})\\s*${label}`, 'i');
    const uncheckedRe = new RegExp(`(?:${UNCHECKED})\\s*${label}`, 'i');
    if (checkedRe.test(normalized)) {
      sawAnyGlyph = true;
      found.push(value);
    } else if (uncheckedRe.test(normalized)) {
      sawAnyGlyph = true;
    }
  }

  if (!sawAnyGlyph) return null;

  // Restore intake / options order
  const order = new Map<string, number>(
    DRIVERS_LICENSE_TYPE_VALUES.map((v, i) => [v, i])
  );
  return [...new Set(found)].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999)
  );
}

const TRANSPORT_LABELS = [...TRANSPORT_TYPE_OPTIONS] as string[];

/**
 * Detect vervoer checkboxes from the "Hoe verplaatst werknemer zich" row only.
 * Returns null when that row has no clear checkbox glyphs.
 */
export function detectTransportFromIntakeText(
  text: string | null | undefined
): string[] | null {
  if (!text) return null;
  const normalized = normalizeIntakeText(text);
  const sectionMatch = normalized.match(
    /Hoe verplaatst werknemer zich\s*:?\s*([\s\S]{0,400})/i
  );
  const section = sectionMatch?.[1] ?? '';
  if (!section.trim()) return null;

  // Stop before next major block if present
  const cut = section.split(/\n\s*Talen\b/i)[0] ?? section;

  const found: string[] = [];
  let sawAnyGlyph = false;

  for (const label of TRANSPORT_LABELS) {
    const esc = escapeRegExp(label);
    const checkedRe = new RegExp(`(?:${CHECKED})\\s*${esc}\\b`, 'i');
    const uncheckedRe = new RegExp(`(?:${UNCHECKED})\\s*${esc}\\b`, 'i');
    if (checkedRe.test(cut)) {
      sawAnyGlyph = true;
      found.push(label);
    } else if (uncheckedRe.test(cut)) {
      sawAnyGlyph = true;
    }
  }

  if (!sawAnyGlyph) return null;
  return found;
}

/**
 * Apply transport / rijbewijs from intake PDF text when checkbox glyphs are present.
 * - Checked boxes → override model (`text`)
 * - All ☐ with glyphs → clear license (and leave transport as absent for gap-fill)
 * - No glyphs → leave mapped alone (`absent`)
 * Mutates `mapped` in place.
 */
export type CheckboxFieldSource = 'text' | 'cleared' | 'absent';

export type IntakeCheckboxOverrideResult = {
  transportSource: CheckboxFieldSource;
  licenseSource: CheckboxFieldSource;
  exWerknemerSource: CheckboxFieldSource;
};

export function applyIntakeCheckboxTextOverrides(
  mapped: Record<string, unknown>,
  text: string | null | undefined
): IntakeCheckboxOverrideResult {
  const transport = detectTransportFromIntakeText(text);
  let transportSource: CheckboxFieldSource;
  if (transport !== null && transport.length > 0) {
    mapped.transport_type = transport;
    transportSource = 'text';
  } else {
    // null or all-unchecked: intake incomplete — keep chatlike/dossier values.
    transportSource = 'absent';
  }

  const licenses = detectDriversLicenseFromIntakeText(text);
  let licenseSource: CheckboxFieldSource;
  if (licenses !== null && licenses.length > 0) {
    mapped.drivers_license_type = licenses;
    mapped.drivers_license = true;
    licenseSource = 'text';
  } else if (licenses !== null) {
    // Glyphs present but all ☐ — authoritative empty (blocks Auto→B invention).
    mapped.drivers_license_type = [];
    mapped.drivers_license = false;
    licenseSource = 'cleared';
  } else {
    // No glyphs near labels: leave model / chatlike alone.
    licenseSource = 'absent';
  }

  const exFromText = detectExWerknemerFromText(text);
  let exWerknemerSource: CheckboxFieldSource;
  if (exFromText !== null) {
    mapped.is_ex_werknemer = applyExWerknemerFromText(mapped.is_ex_werknemer, exFromText);
    exWerknemerSource = 'text';
  } else {
    // Label absent or inconclusive: do not invent; leave model value if present.
    exWerknemerSource = 'absent';
  }

  return { transportSource, licenseSource, exWerknemerSource };
}

export function filterAllowedDriversLicenseTypes(values: unknown[]): string[] {
  const allowed = new Set<string>(DRIVERS_LICENSE_TYPE_VALUES);
  const aliases: Record<string, string> = {
    'code 96': 'B+',
    'b+ (code 96)': 'B+',
    code96: 'B+',
  };
  const out: string[] = [];
  for (const raw of values) {
    const s = String(raw).trim();
    if (!s) continue;
    if (allowed.has(s)) {
      out.push(s);
      continue;
    }
    const aliased = aliases[s.toLowerCase()];
    if (aliased && allowed.has(aliased)) out.push(aliased);
  }
  return out;
}

/** Label lookup for prompts / debugging (not required for detection). */
export function driversLicenseOptionLabel(value: string): string | undefined {
  return DRIVERS_LICENSE_TYPE_OPTIONS.find((o) => o.value === value)?.label;
}
