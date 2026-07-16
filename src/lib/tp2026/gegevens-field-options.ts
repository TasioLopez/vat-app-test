/** Shared option lists for Gegevens / employee profile fields. */

import { isAbsentText } from '@/lib/utils';

export const EDUCATION_LEVEL_OPTIONS = [
  'Praktijkonderwijs',
  'VMBO',
  'Huishoudschool',
  'LTS',
  'LHNO',
  'HAVO',
  'VWO',
  'MBO 1',
  'MBO 2',
  'MTS',
  'MBO 3',
  'MBO 4',
  'HBO',
  'WO',
] as const;

export type EducationLevelOption = (typeof EDUCATION_LEVEL_OPTIONS)[number];

/** Relative rank for comparing education levels (Huishoudschool = VMBO tier). */
export const EDUCATION_LEVEL_RANK: Record<EducationLevelOption, number> = {
  Praktijkonderwijs: 1,
  VMBO: 2,
  Huishoudschool: 2,
  LTS: 3,
  LHNO: 3,
  HAVO: 4,
  VWO: 5,
  'MBO 1': 6,
  'MBO 2': 7,
  MTS: 8,
  'MBO 3': 9,
  'MBO 4': 10,
  HBO: 11,
  WO: 12,
};

function compactEducationToken(value: string): string {
  return value.toLowerCase().replace(/[\s\-–—]+/g, '');
}

/** Map raw education_level strings to canonical EDUCATION_LEVEL_OPTIONS values. */
export function normalizeEducationLevel(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  if ((EDUCATION_LEVEL_OPTIONS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  for (const option of EDUCATION_LEVEL_OPTIONS) {
    if (option.toLowerCase() === lower) return option;
  }

  const compact = compactEducationToken(trimmed);
  for (const option of EDUCATION_LEVEL_OPTIONS) {
    if (compactEducationToken(option) === compact) return option;
  }

  const mboMatch = lower.match(/^mbo[\s\-–—]?([1-4])$/);
  if (mboMatch) return `MBO ${mboMatch[1]}` as EducationLevelOption;

  if (lower === 'middelbare technische school') return 'MTS';
  if (lower === 'lagere technische school') return 'LTS';
  if (lower === 'huishoudschool') return 'Huishoudschool';
  if (lower === 'lhno') return 'LHNO';

  return undefined;
}

/** Safety/vocational certificates — not schooling levels or specializations. */
export function isEducationCertification(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase();
  if (/^V{1,2}CA(?:\s*[-–—]?\s*VOL)?(?:\s*\(\d{4}\))?$/.test(upper)) return true;
  if (/^(BHV|EHBO|HEFTRUCK|REACH\s*TRUCK|Heftruckcertificaat)\b/i.test(trimmed)) return true;
  return false;
}

function educationTextSearchPatterns(): { pattern: RegExp; canonical: string }[] {
  const patterns: { pattern: RegExp; canonical: string }[] = [
    { pattern: /\bMIDDELBARE\s+TECHNISCHE\s+SCHOOL\b/i, canonical: 'MTS' },
    { pattern: /\bLAGERE\s+TECHNISCHE\s+SCHOOL\b/i, canonical: 'LTS' },
  ];

  for (const option of EDUCATION_LEVEL_OPTIONS) {
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    patterns.push({
      pattern: new RegExp(`\\b${escaped}\\b`, 'i'),
      canonical: option,
    });
  }

  for (let i = 4; i >= 1; i--) {
    patterns.push({
      pattern: new RegExp(`\\bMBO[\\s\\-–—]?${i}\\b`, 'i'),
      canonical: `MBO ${i}`,
    });
  }

  return patterns;
}

/** Find education levels in document order (first occurrence wins for duplicates). */
export function extractEducationLevelsInTextOrder(text: string): string[] {
  if (!text) return [];

  const found: { index: number; canonical: string }[] = [];

  for (const { pattern, canonical } of educationTextSearchPatterns()) {
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      found.push({ index: match.index, canonical });
    }
  }

  found.sort((a, b) => a.index - b.index);

  const levels: string[] = [];
  for (const { canonical } of found) {
    if (!levels.includes(canonical)) levels.push(canonical);
  }
  return levels;
}

/** Slice text around the intake education table block. */
export function sliceEducationSection(text: string): string {
  if (!text) return text;

  const markers = [/opleidingen\s*\??\s*afgerond\s*\??/i, /algemene\s+informatie/i];
  let start = -1;
  for (const marker of markers) {
    const match = text.match(marker);
    if (match?.index !== undefined && (start === -1 || match.index < start)) {
      start = match.index;
    }
  }

  if (start === -1) return text;

  const sliceFromStart = text.slice(start);
  const endMarkers = [/praktische\s+belemmeringen/i, /\bsectie\s+\d+\b/i];
  let end = Math.min(start + 2500, text.length);

  for (const marker of endMarkers) {
    const match = sliceFromStart.match(marker);
    if (match?.index !== undefined && match.index > 10) {
      end = Math.min(start + match.index, end);
      break;
    }
  }

  return text.slice(start, end);
}

/** Pick highest-ranked level from a list (used as fallback when document order is unclear). */
export function getHighestEducationLevel(levels: string[]): string | null {
  if (!levels?.length) return null;

  let highestLevel: string | null = null;
  let highestRank = 0;

  for (const level of levels) {
    if (!level) continue;
    const normalized = normalizeEducationLevel(level) ?? level.trim();
    const rank = EDUCATION_LEVEL_RANK[normalized as EducationLevelOption];

    if (rank !== undefined) {
      if (rank > highestRank) {
        highestRank = rank;
        highestLevel = normalized;
      }
      continue;
    }

    for (const [key, r] of Object.entries(EDUCATION_LEVEL_RANK)) {
      if (
        normalized.toUpperCase().includes(key.toUpperCase()) ||
        key.toUpperCase().includes(normalized.toUpperCase())
      ) {
        if (r > highestRank) {
          highestRank = r;
          highestLevel = key;
        }
        break;
      }
    }
  }

  return highestLevel;
}

export type IntakeEducationRow = {
  level: string;
  name?: string;
  finished: boolean;
};

/** Reject non-schooling tokens that sometimes appear in autofill output. */
export function isInvalidEducationLevelToken(value: unknown): boolean {
  if (value == null) return true;
  if (isAbsentText(value)) return true;
  const lower = String(value).trim().toLowerCase();
  return lower === 'nee' || lower === 'nei' || lower === 'ongeschoold';
}

/** Detect Afgerond=Ja from words or V7 checkboxes. */
export function detectEducationLineFinished(line: string): boolean | null {
  const lower = line.toLowerCase();

  if (/\bniet\s+afgerond\b/.test(lower)) return false;
  if (/\bnee\b/.test(lower)) return false;

  // V7 checkbox pairs: first box = Ja, second = Nee
  if (/☐\s*☒/.test(line) || /☐\s*☑/.test(line)) return false;
  if (/☒\s*☐/.test(line) || /☑\s*☐/.test(line)) return true;

  if (/\bafgerond\b/.test(lower)) return true;
  if (/\bja\b/.test(lower)) return true;

  // Lone checked box in Afgerond column
  if (/[☒☑✓✔]/.test(line) && !/☐/.test(line)) return true;
  if (/\[\s*x\s*\]/i.test(line)) return true;

  return null;
}

function findLevelInEducationLine(line: string): { level: string; remainder: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  for (const { pattern, canonical } of levelPrefixPatterns()) {
    const match = trimmed.match(pattern);
    if (match) {
      const remainder = trimmed
        .slice(match[0].length)
        .replace(/^[\s\-–—]+/, '')
        .trim();
      return { level: canonical, remainder };
    }
  }

  return null;
}

function stripWorkExperienceTailFromEducationName(name: string): string {
  let s = name.trim();
  if (!s) return s;

  // Combined opleiding/werkervaring row: keep text before checkbox cluster
  const checkboxIdx = s.search(/[☒☐☑✓✔]/);
  if (checkboxIdx > 0) {
    s = s.slice(0, checkboxIdx).trim();
  }

  // Drop werkervaring-column employer/duration tails
  s = s
    .replace(/\b\d+\+?\s*jaar\b.*$/i, '')
    .replace(/\b(?:voor\s+)?studie\b.*$/i, '')
    .replace(/\bAxxicom\b.*$/i, '')
    .trim();

  return s;
}

function cleanEducationNameFromLine(remainder: string, level: string): string | undefined {
  let name = remainder
    .replace(/[☒☐☑✓✔]/g, ' ')
    .replace(/\b(?:ja|nee|afgerond|niet\s+afgerond)\b/gi, '')
    .replace(/^[\s\-–—,;:]+|[\s\-–—,;:]+$/g, '')
    .trim();

  name = stripWorkExperienceTailFromEducationName(name);

  if (!name) return undefined;
  if (isEducationCertification(name)) return undefined;

  const stripped = stripLevelPrefixFromName(level, name);
  name = stripped || name;
  if (!name || name.toLowerCase() === level.toLowerCase()) return undefined;
  return name;
}

/** Parse intake education table rows with Afgerond status. */
export function parseIntakeEducationRows(sectionText: string): IntakeEducationRow[] {
  if (!sectionText?.trim()) return [];

  const rows: IntakeEducationRow[] = [];

  for (const rawLine of sectionText.split(/[\n\r]+/)) {
    let line = rawLine.trim();
    if (!line) continue;
    if (/^algemene\s+informatie/i.test(line)) continue;
    if (/^werkervaring/i.test(line)) continue;

    if (/^opleidingen/i.test(line)) {
      const afterHeader = line.replace(/^opleidingen\s*\??\s*afgerond\s*\??\s*/i, '').trim();
      if (!afterHeader) continue;
      line = afterHeader;
    }

    const found = findLevelInEducationLine(line);
    if (!found) continue;

    const { level, remainder } = found;
    if (isEducationCertification(level)) continue;

    const finishedStatus = detectEducationLineFinished(line);
    const finished = finishedStatus === true;

    const name = cleanEducationNameFromLine(remainder, level);

    rows.push({ level, name, finished });
  }

  return rows;
}

/** Pick the highest finished schooling row from parsed intake rows. */
export function resolveHighestFinishedEducation(rows: IntakeEducationRow[]): {
  education_level?: string;
  education_name?: string;
} {
  const finished = rows.filter((row) => row.finished);
  if (finished.length === 0) return {};

  const highestLevel = getHighestEducationLevel(finished.map((row) => row.level));
  if (!highestLevel) return {};

  const matching = finished.filter((row) => row.level === highestLevel);
  const name = matching
    .map((row) => row.name)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.length - a.length)[0];

  return {
    education_level: highestLevel,
    ...(name ? { education_name: name } : {}),
  };
}

/**
 * Resolve education_level from intake document text: highest finished base schooling.
 * Falls back to normalized LLM level only when document text is absent.
 */
export function resolveEducationLevelFromIntake(
  mappedLevel: unknown,
  rawText: string
): string | undefined {
  if (rawText?.trim()) {
    const section = sliceEducationSection(rawText);
    const resolved = resolveHighestFinishedEducation(parseIntakeEducationRows(section));
    if (resolved.education_level) return resolved.education_level;
    return undefined;
  }

  const llmLevel = normalizeEducationLevel(mappedLevel);
  if (llmLevel && !isInvalidEducationLevelToken(mappedLevel)) return llmLevel;

  return undefined;
}

function levelPrefixPatterns(): { pattern: RegExp; canonical: string }[] {
  const patterns: { pattern: RegExp; canonical: string }[] = [];

  for (const option of EDUCATION_LEVEL_OPTIONS) {
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    patterns.push({
      pattern: new RegExp(`^${escaped}(?:\\s|$|[-–—])`, 'i'),
      canonical: option,
    });
  }

  for (let i = 1; i <= 4; i++) {
    patterns.push({
      pattern: new RegExp(`^MBO[\\s\\-–—]?${i}(?:\\s|$|[-–—])`, 'i'),
      canonical: `MBO ${i}`,
    });
  }

  patterns.push({
    pattern: /^MBO(?:\s|$|[-–—])/i,
    canonical: 'MBO 4',
  });

  patterns.push({
    pattern: /^MIDDELBARE\s+TECHNISCHE\s+SCHOOL(?:\s|$|[-–—])/i,
    canonical: 'MTS',
  });
  patterns.push({
    pattern: /^LAGERE\s+TECHNISCHE\s+SCHOOL(?:\s|$|[-–—])/i,
    canonical: 'LTS',
  });

  return patterns.sort((a, b) => b.pattern.source.length - a.pattern.source.length);
}

function extractLevelFromEducationName(name: string): { level?: string; remainder?: string } {
  const trimmed = name.trim();
  if (!trimmed) return {};

  for (const { pattern, canonical } of levelPrefixPatterns()) {
    const match = trimmed.match(pattern);
    if (match) {
      const remainder = trimmed.slice(match[0].length).replace(/^[\s\-–—]+/, '').trim();
      return { level: canonical, remainder: remainder || undefined };
    }
  }

  return {};
}

function stripLevelPrefixFromName(level: string, name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  const canonical = normalizeEducationLevel(level);
  if (!canonical) return trimmed;

  for (const { pattern, canonical: patCanonical } of levelPrefixPatterns()) {
    if (patCanonical !== canonical) continue;
    const match = trimmed.match(pattern);
    if (match) {
      return trimmed.slice(match[0].length).replace(/^[\s\-–—]+/, '').trim();
    }
  }

  return trimmed;
}

/** Split or dedupe education level vs specialization (education_name). */
export function splitEducationNameLevel(
  level: string | undefined,
  name: string | undefined
): { level?: string; name?: string } {
  const normalizedLevel = level ? normalizeEducationLevel(level) : undefined;
  let normalizedName = name?.trim() || undefined;

  if (!normalizedLevel && normalizedName) {
    const extracted = extractLevelFromEducationName(normalizedName);
    if (extracted.level) {
      return {
        level: extracted.level,
        name: extracted.remainder,
      };
    }
  }

  if (normalizedLevel && normalizedName) {
    const stripped = stripLevelPrefixFromName(normalizedLevel, normalizedName);
    return {
      level: normalizedLevel,
      name: stripped || undefined,
    };
  }

  return {
    level: normalizedLevel,
    name: normalizedName,
  };
}

/** Normalize education_level and education_name together (load/repair). */
export function repairEmployeeEducationFields(
  level: unknown,
  name: unknown
): { education_level?: string; education_name?: string } {
  if (level != null && String(level).trim() && isInvalidEducationLevelToken(level)) {
    return {};
  }

  const split = splitEducationNameLevel(
    level != null && String(level).trim() ? String(level) : undefined,
    name != null && String(name).trim() ? String(name) : undefined
  );

  if (!split.level || isInvalidEducationLevelToken(split.level)) {
    return {};
  }

  let educationName = split.name;
  if (educationName && isEducationCertification(educationName)) {
    educationName = undefined;
  }
  if (
    educationName &&
    split.level &&
    educationName.toLowerCase() === split.level.toLowerCase()
  ) {
    educationName = undefined;
  }

  return {
    education_level: split.level,
    education_name: educationName,
  };
}

export const TRANSPORT_TYPE_OPTIONS = ['Auto', 'Fiets', 'OV', 'Lopend'] as const;

const TRANSPORT_TYPE_SET = new Set<string>(TRANSPORT_TYPE_OPTIONS);

/** Keep only intake-aligned vervoer values (drops Bromfiets/Motor and unknowns). */
export function filterAllowedTransportTypes(values: unknown[]): string[] {
  return values
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0 && TRANSPORT_TYPE_SET.has(v));
}

/** When intake was processed, transport_type must not be filled from other docs. */
export function isIntakeLockedTransportField(
  intakeProcessed: boolean,
  key: string
): boolean {
  return intakeProcessed && key === 'transport_type';
}


export const DRIVERS_LICENSE_TYPE_OPTIONS = [
  { value: 'B', label: 'B (Auto)' },
  { value: 'C', label: 'C (Vrachtwagen)' },
  { value: 'C1', label: 'C1 (Middelgrote vrachtwagen)' },
  { value: 'D', label: 'D (Bus)' },
  { value: 'D1', label: 'D1 (Kleine bus)' },
  { value: 'E', label: 'E (Aanhangwagen)' },
  { value: 'A', label: 'A (Motor)' },
  { value: 'AM', label: 'AM (Bromfiets)' },
  { value: 'A1', label: 'A1 (Motor beperkt)' },
  { value: 'A2', label: 'A2 (Motor beperkt)' },
  { value: 'BE', label: 'BE (Auto + Aanhangwagen)' },
  { value: 'CE', label: 'CE (Vrachtwagen + Aanhangwagen)' },
  { value: 'DE', label: 'DE (Bus + Aanhangwagen)' },
  { value: 'T', label: 'T (Trekker)' },
] as const;

export const COMPUTER_SKILLS_OPTIONS = [
  { value: '1', label: '1 - Geen' },
  { value: '2', label: '2 - Basis (e-mail, browsen)' },
  { value: '3', label: '3 - Gemiddeld (Word, Excel)' },
  { value: '4', label: "4 - Geavanceerd (meerdere programma's)" },
  { value: '5', label: '5 - Expert (IT-gerelateerde vaardigheden)' },
] as const;

export const DUTCH_LANGUAGE_OPTIONS = ['Goed', 'Matig', 'Onvoldoende'] as const;

export const DRIVERS_LICENSE_TYPE_VALUES = DRIVERS_LICENSE_TYPE_OPTIONS.map((o) => o.value);
