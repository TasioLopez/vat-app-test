/** Intake "Algemene informatie" table extraction (opleidingen + werkervaring). */
import { parseWorkExperience } from '@/lib/utils';
import {
  extractEducationLevelsInTextOrder,
  isEducationCertification,
  normalizeEducationLevel,
  resolveEducationLevelFromIntake,
  sliceEducationSection,
} from '@/lib/tp2026/gegevens-field-options';

export { isEducationCertification };

const WORK_EXPERIENCE_END_MARKERS = [
  /rijbewijzen/i,
  /digitale\s+vaardigheden/i,
  /computervaardigheden/i,
  /hoe\s+verplaatst/i,
  /vervoer/i,
  /talen/i,
  /praktische\s+belemmeringen/i,
];

const DATE_ONLY_PATTERN = /^(?:\d{4}\s*[-–—]\s*(?:\d{4}|heden)|\d+[,.]?\d*\s*jaar|heden)$/i;

const JOB_TITLE_KEYWORDS =
  /\b(medewerker|teamleider|assistent|thuiszorg|verzorgende|magazijn|productie|logistiek|administratief|kassier|winkel|keuken|schoonmaak|operator|monteur|chauffeur|begeleider)\b/i;

const ROLE_FRAGMENTS = [
  'assistent',
  'medewerker',
  'teamleider',
  'thuiszorg',
  'verzorgende',
  'leider',
  'operator',
  'monteur',
  'chauffeur',
  'begeleider',
  'schoonmaak',
];

function looksLikeJobTitle(text: string): boolean {
  if (JOB_TITLE_KEYWORDS.test(text)) return true;
  if (/\b(PostNL|PTT)\b/i.test(text)) return true;
  const lower = text.toLowerCase();
  return ROLE_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function sanitizeEducationName(
  name: unknown,
  level: string | undefined
): string | undefined {
  if (name == null || String(name).trim() === '') return undefined;
  const trimmed = String(name).trim();
  if (isEducationCertification(trimmed)) return undefined;
  if (level && trimmed.toLowerCase() === level.toLowerCase()) return undefined;
  const normalizedFromName = normalizeEducationLevel(trimmed);
  if (normalizedFromName && normalizedFromName === level) return undefined;
  return trimmed;
}

function extractPrimaryEducationLabelFromSection(section: string): string | undefined {
  const beforeWork = section.split(/werkervaring\s*\??\s*van[\s-]*tot\s*\??/i)[0] ?? section;
  const lhnoMatch = beforeWork.match(/\bLHNO\b/i);
  if (lhnoMatch) return 'LHNO';

  const ordered = extractEducationLevelsInTextOrder(beforeWork);
  for (const label of ordered) {
    const normalized = normalizeEducationLevel(label);
    if (normalized) return normalized;
  }
  return undefined;
}

export function resolveIntakeEducationFields(
  mapped: { education_level?: unknown; education_name?: unknown },
  rawText: string
): { education_level?: string; education_name?: string } {
  let level = resolveEducationLevelFromIntake(mapped.education_level, rawText);

  if (!level && rawText) {
    const section = sliceEducationSection(rawText);
    level = extractPrimaryEducationLabelFromSection(section);
  }

  if (!level && mapped.education_level != null) {
    const raw = String(mapped.education_level).trim();
    const normalized = normalizeEducationLevel(raw);
    if (normalized) level = normalized;
  }

  let name = sanitizeEducationName(mapped.education_name, level);

  if (level && !name && mapped.education_name != null) {
    name = sanitizeEducationName(mapped.education_name, level);
  }

  return {
    ...(level ? { education_level: level } : {}),
    ...(name ? { education_name: name } : {}),
  };
}

/** Slice text around the intake werkervaring table. */
export function sliceWorkExperienceSection(text: string): string {
  if (!text) return text;

  const markers = [
    /werkervaring\s*\??\s*van[\s-]*tot\s*\??/i,
    /werkervaring\s*\??/i,
    /algemene\s+informatie/i,
  ];

  let start = -1;
  for (const marker of markers) {
    const match = text.match(marker);
    if (match?.index !== undefined) {
      const isGeneric = /algemene\s+informatie/i.test(marker.source);
      if (isGeneric && start !== -1) continue;
      if (start === -1 || (!isGeneric && match.index < start)) {
        start = match.index;
      }
    }
  }

  if (start === -1) return text;

  const sliceFromStart = text.slice(start);
  let end = Math.min(start + 2500, text.length);

  for (const marker of WORK_EXPERIENCE_END_MARKERS) {
    const match = sliceFromStart.match(marker);
    if (match?.index !== undefined && match.index > 15) {
      end = Math.min(start + match.index, end);
      break;
    }
  }

  return text.slice(start, end);
}

function splitWorkExperienceLines(section: string): string[] {
  return section
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractTitleFromTableLine(line: string): string | undefined {
  const withoutDates = line
    .replace(/\b\d{4}\s*[-–—]\s*(?:\d{4}|heden)\b/gi, '')
    .replace(/\b\d+[,.]?\d*\s*jaar\b/gi, '')
    .trim();

  const parts = withoutDates.split(/\t+| {2,}|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const candidates = parts.length > 1 ? [parts[0]] : [withoutDates];

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/^[\d.)]+\s*/, '').trim();
    if (!cleaned || cleaned.length < 3) continue;
    if (DATE_ONLY_PATTERN.test(cleaned)) continue;
    if (!looksLikeJobTitle(cleaned)) continue;
    return cleaned;
  }
  return undefined;
}

function countWorkTitles(value: string): number {
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function extractWorkTitlesFromSection(section: string): string[] {
  const titles: string[] = [];
  for (const line of splitWorkExperienceLines(section)) {
    if (/^werkervaring/i.test(line)) continue;
    if (/^van[\s-]*tot\s*$/i.test(line)) continue;

    const title = extractTitleFromTableLine(line);
    if (title && !titles.some((t) => t.toLowerCase() === title.toLowerCase())) {
      titles.push(title);
    }
  }
  return titles;
}

export function resolveWorkExperienceFromIntake(
  mappedWorkExperience: unknown,
  rawText: string
): string | undefined {
  const mapped =
    mappedWorkExperience != null && String(mappedWorkExperience).trim()
      ? parseWorkExperience(String(mappedWorkExperience).trim())
      : '';

  if (mapped && countWorkTitles(mapped) >= 2) {
    return mapped;
  }

  if (!rawText) return mapped || undefined;

  const section = sliceWorkExperienceSection(rawText);
  const extracted = extractWorkTitlesFromSection(section);
  if (extracted.length === 0) return mapped || undefined;

  const joined = extracted.join(', ');
  if (!mapped) return joined;
  if (countWorkTitles(mapped) >= countWorkTitles(joined)) return mapped;
  return joined;
}
