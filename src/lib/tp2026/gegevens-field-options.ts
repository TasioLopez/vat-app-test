/** Shared option lists for Gegevens / employee profile fields. */

export const EDUCATION_LEVEL_OPTIONS = [
  'Praktijkonderwijs',
  'VMBO',
  'LTS',
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
  const split = splitEducationNameLevel(
    level != null && String(level).trim() ? String(level) : undefined,
    name != null && String(name).trim() ? String(name) : undefined
  );
  return {
    education_level: split.level,
    education_name: split.name,
  };
}

export const TRANSPORT_TYPE_OPTIONS = ['Auto', 'Fiets', 'Bromfiets', 'Motor', 'OV'] as const;

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
