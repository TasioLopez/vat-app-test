/** Deterministic doctor / OSV role checkbox detection from intake plain text (Juni V6). */

import {
  expandDoctorRoleAbbreviations,
  stripLeadingDoctorRolePrefix,
  type DoctorRole,
} from '@/lib/tp/format-context';

export type DetectedDoctorRoles = {
  doctor_role: DoctorRole | null;
  osv_doctor_role: DoctorRole | null;
  primary_name: string | null;
  osv_name: string | null;
};

const ROLE_SPECS: { role: DoctorRole; label: string }[] = [
  { role: 'Anios', label: 'Anios' },
  { role: 'Aios', label: 'Aios' },
  { role: 'Arts', label: 'Arts' },
  { role: 'BA', label: 'BA' },
  { role: 'VA', label: 'VA' },
];

const CHECKED = String.raw`[☒☑✓✔]`;

function normalizeIntakeText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
}

function isRoleChecked(segment: string, label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Checkbox immediately before the label (Hippman: ☒ Arts ☐ Anios …).
  // Do not use "Label ☒" alone — in "☐ BA ☒ VA" that falsely marks BA.
  const otherRoles = String.raw`(?:Arts|Anios|Aios|BA|VA)`;
  const patterns = [
    new RegExp(`${CHECKED}\\s*${escaped}\\b`, 'i'),
    new RegExp(`\\[[xX]\\]\\s*${escaped}\\b`, 'i'),
    new RegExp(`\\([xX]\\)\\s*${escaped}\\b`, 'i'),
    // Trailing mark only when not followed by another role label (e.g. "Arts ☒:").
    new RegExp(`\\b${escaped}\\s*${CHECKED}(?!\\s*${otherRoles}\\b)`, 'i'),
    new RegExp(`\\b${escaped}\\s*\\[[xX]\\](?!\\s*${otherRoles}\\b)`, 'i'),
    new RegExp(`\\b${escaped}\\s*\\([xX]\\)(?!\\s*${otherRoles}\\b)`, 'i'),
  ];
  return patterns.some((re) => re.test(segment));
}

/** Exactly one checked role in segment → that role; else null. */
export function detectSingleCheckedRole(segment: string): DoctorRole | null {
  if (!segment.trim()) return null;

  const checked: DoctorRole[] = [];
  for (const { role, label } of ROLE_SPECS) {
    if (isRoleChecked(segment, label)) checked.push(role);
  }

  if (checked.length === 1) return checked[0];
  return null;
}

function extractTrailingName(segment: string): string | null {
  const cleaned = segment.replace(/\s+/g, ' ').trim();

  // Name after the role-checkbox colon; cut before next field labels.
  const afterRoles = cleaned.match(/\b(?:Arts|Anios|Aios|BA|VA)\b[^:]*:\s*(.+)$/i);
  if (afterRoles?.[1]) {
    const rest = afterRoles[1]
      .split(/\s+(?:Datum(?:\s*AD-?(?:rapport)?)?|Naam\s*AD|Concept|OSV)\b/i)[0]
      ?.trim() ?? '';
    const nameMatch = rest.match(
      /^([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ.\'\-]*(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ.\'\-]*){0,4})/
    );
    const name = nameMatch?.[1]?.trim() ?? '';
    if (name && !/^(Arts|Anios|Aios|BA|VA|Bedrijfsarts|Verzekeringsarts)$/i.test(name)) {
      return name;
    }
  }

  const match = cleaned.match(
    /:\s*([A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ.\'\-]*(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÿ.\'\-]*){0,4})\s*$/
  );
  if (!match?.[1]) return null;
  const name = match[1].trim();
  if (/^(Arts|Anios|Aios|BA|VA|Bedrijfsarts|Verzekeringsarts)$/i.test(name)) return null;
  if (/\b(Datum|Concept|OSV)\b/i.test(name)) return null;
  return name;
}

function extractPrimarySegment(text: string): string | null {
  // Prefer a Naam row that carries role checkboxes and is not "Naam AD".
  const naamRe =
    /(?:^|\n)\s*Naam(?!\s*AD\b)(?!\s*werknemer\b)(?!\s*contactpersoon\b)\b([^\n]{0,240})/gi;
  let match: RegExpExecArray | null;
  while ((match = naamRe.exec(text)) !== null) {
    const line = match[1] ?? '';
    if (!/\b(Arts|Anios|Aios|BA|VA)\b/i.test(line)) continue;
    if (/^\s*OSV\b/i.test(line)) continue;
    return `Naam${line}`;
  }

  // Fallback: window from Naam … until OSV / Naam AD
  const windowMatch = text.match(
    /\bNaam(?!\s*AD\b)(?!\s*werknemer\b)\b[\s\S]{0,280}?(?=\bOSV\b|\bNaam\s*AD\b|\bGeboortedatum\b|$)/i
  );
  if (windowMatch && /\b(Arts|Anios|Aios|BA|VA)\b/i.test(windowMatch[0])) {
    return windowMatch[0];
  }
  return null;
}

function extractOsvSegment(text: string): string | null {
  const lineMatch = text.match(/(?:^|\n)\s*OSV\b([^\n]{0,240})/i);
  if (lineMatch) return `OSV${lineMatch[1] ?? ''}`;

  const windowMatch = text.match(
    /\bOSV\b[\s\S]{0,280}?(?=\bNaam\s*AD\b|\bGeboortedatum\b|\bEx[-\s]?werknemer\b|$)/i
  );
  return windowMatch ? windowMatch[0] : null;
}

/**
 * Detect primary + OSV doctor roles (and optional names) from intake plain text.
 * Returns null roles when checkbox state is inconclusive.
 */
export function detectDoctorRolesFromText(
  text: string | null | undefined
): DetectedDoctorRoles {
  const empty: DetectedDoctorRoles = {
    doctor_role: null,
    osv_doctor_role: null,
    primary_name: null,
    osv_name: null,
  };
  if (!text?.trim()) return empty;

  const normalized = normalizeIntakeText(text);
  const primarySeg = extractPrimarySegment(normalized);
  const osvSeg = extractOsvSegment(normalized);

  return {
    doctor_role: primarySeg ? detectSingleCheckedRole(primarySeg) : null,
    osv_doctor_role: osvSeg ? detectSingleCheckedRole(osvSeg) : null,
    primary_name: primarySeg ? extractTrailingName(primarySeg) : null,
    osv_name: osvSeg ? extractTrailingName(osvSeg) : null,
  };
}

/** Primary name only (strip title + supervisie clause). */
export function barePrimaryDoctorName(value: string): string {
  const expanded = expandDoctorRoleAbbreviations(value.trim()).replace(/\s+/g, ' ').trim();
  const primary = expanded.split(/\s+werkend onder supervisie van/i)[0]?.trim() ?? '';
  return stripLeadingDoctorRolePrefix(primary);
}

/** Supervisor name from a supervisie phrase, if present. */
export function bareOsvNameFromOrg(value: string): string | null {
  const expanded = expandDoctorRoleAbbreviations(value.trim()).replace(/\s+/g, ' ').trim();
  const match = expanded.match(/werkend onder supervisie van\s+(.+)$/i);
  if (!match?.[1]) return null;
  const name = stripLeadingDoctorRolePrefix(match[1].trim());
  return name || null;
}

/**
 * Merge model TP2 doctor fields with plain-text role detection.
 * Text-detected roles win; forces bare names so normalizeTp2ExtractedData rebuilds the phrase.
 */
export function applyDoctorRolesFromText(
  model: Record<string, unknown>,
  detected: DetectedDoctorRoles
): Record<string, unknown> {
  const hasSignal =
    detected.doctor_role != null ||
    detected.osv_doctor_role != null ||
    Boolean(detected.primary_name?.trim()) ||
    Boolean(detected.osv_name?.trim());
  if (!hasSignal) return model;

  const out: Record<string, unknown> = { ...model };

  if (detected.doctor_role) out.doctor_role = detected.doctor_role;
  if (detected.osv_doctor_role) out.osv_doctor_role = detected.osv_doctor_role;

  const existingOrg =
    typeof out.occupational_doctor_org === 'string' ? out.occupational_doctor_org.trim() : '';
  const existingOsv =
    typeof out.osv_doctor_name === 'string' ? out.osv_doctor_name.trim() : '';

  const primaryName =
    detected.primary_name?.trim() ||
    (existingOrg ? barePrimaryDoctorName(existingOrg) : '') ||
    '';
  const osvName =
    detected.osv_name?.trim() ||
    existingOsv ||
    (existingOrg ? bareOsvNameFromOrg(existingOrg) : '') ||
    '';

  const shouldRebuild =
    Boolean(primaryName) &&
    (detected.doctor_role != null ||
      detected.osv_doctor_role != null ||
      Boolean(osvName) ||
      /werkend onder supervisie van/i.test(existingOrg));

  if (shouldRebuild) {
    out.occupational_doctor_org = primaryName;
    if (osvName) out.osv_doctor_name = osvName;
  }

  return out;
}
