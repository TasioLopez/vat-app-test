/** Shared option lists for Gegevens / employee profile fields. */

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

/**
 * Resolve education_level after intake autofill: trust valid LLM output;
 * otherwise prefer first level in the education section (top table row).
 */
export function resolveEducationLevelFromIntake(
  mappedLevel: unknown,
  rawText: string
): string | undefined {
  const llmLevel = normalizeEducationLevel(mappedLevel);
  if (llmLevel) return llmLevel;

  if (!rawText) return undefined;

  const section = sliceEducationSection(rawText);
  const ordered = extractEducationLevelsInTextOrder(section);
  const primary = ordered[0] ? normalizeEducationLevel(ordered[0]) : undefined;
  return primary ?? getHighestEducationLevel(ordered) ?? undefined;
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
