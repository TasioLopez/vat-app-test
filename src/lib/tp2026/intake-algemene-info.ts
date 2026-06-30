/** Intake "Algemene informatie" table extraction (opleidingen + werkervaring). */
import { parseWorkExperience } from '@/lib/utils';
import { stripAssistantArtifacts } from '@/lib/document-analysis/stripAssistantArtifacts';
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

const DATE_ONLY_PATTERN = /^(?:\d{4}\s*[-–—]\s*(?:\d{4}|heden)|\d+[,.]?\d*\s*jaar|heden|ongeveer\s+\d+\s*jaar(?:\s+gedaan)?)$/i;

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

function normalizeTitleText(text: string): string {
  return stripAssistantArtifacts(text)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.。]+$/g, '')
    .trim()
    .toLowerCase();
}

/** Reject LLM output that still looks like extraction metadata, not a job title list. */
export function isPlausibleWorkExperience(raw: string): boolean {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length < 3) return false;
  if (/【|†source|\*\*/.test(trimmed)) return false;
  if (/(?:^|[\s,;])(?:current_job|work_experience)\s*:/i.test(trimmed)) return false;
  if (/^[\s\-•*]+/.test(trimmed)) return false;
  return true;
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
  documentText: string
): { education_level?: string; education_name?: string } {
  let level = resolveEducationLevelFromIntake(mapped.education_level, documentText);

  if (!level && documentText) {
    const section = sliceEducationSection(documentText);
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

function stripDatesFromLine(line: string): string {
  return line
    .replace(/\b\d{4}\s*[-–—]\s*(?:\d{4}|heden)\b/gi, '')
    .replace(/\b\d+[,.]?\d*\s*jaar(?:\s+gedaan)?\b/gi, '')
    .replace(/\bongeveer\s+\d+\s*jaar(?:\s+gedaan)?\b/gi, '')
    .trim();
}

function extractTitleFromTableLine(line: string): string | undefined {
  const withoutDates = stripDatesFromLine(line);
  const parts = withoutDates.split(/\t+| {2,}|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const candidates = parts.length > 1 ? parts : [withoutDates];

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/^[\d.)]+\s*/, '').trim();
    if (!cleaned || cleaned.length < 3) continue;
    if (DATE_ONLY_PATTERN.test(cleaned)) continue;
    if (/^(?:ja|nee|x)$/i.test(cleaned)) continue;
    if (!looksLikeJobTitle(cleaned)) continue;
    return cleaned;
  }
  return undefined;
}

const WORK_EXPERIENCE_FIELD_LABEL =
  /^\s*[-*•]?\s*(?:\*\*)?(?:current_job|work_experience)(?:\*\*)?\s*:\s*/i;

function titleOverlapsCurrentJob(title: string, currentJob: string): boolean {
  const t = normalizeTitleText(title);
  const c = normalizeTitleText(currentJob);
  if (!t || !c) return false;
  if (t === c) return true;
  if (c.includes(t) || t.includes(c)) return true;
  const prefix = t.split(/\s+/).slice(0, 4).join(' ');
  return prefix.length >= 8 && c.includes(prefix);
}

function sanitizeWorkExperiencePart(part: string, currentJob?: string): string {
  let cleaned = stripAssistantArtifacts(part)
    .replace(WORK_EXPERIENCE_FIELD_LABEL, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/^(?:current_job|work_experience)\s*:\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.。]+$/g, '')
    .trim();

  if (!cleaned) return '';
  if (/^(?:current_job|work_experience)$/i.test(cleaned)) return '';
  if (currentJob && titleOverlapsCurrentJob(cleaned, currentJob)) return '';
  return cleaned;
}

/** Strip markdown field labels and current_job echoes from autofill work_experience. */
export function sanitizeWorkExperienceString(raw: string, currentJob?: string): string {
  if (!raw?.trim()) return '';

  const parts = raw
    .split(/[,;\n]+/)
    .map((p) => sanitizeWorkExperiencePart(p.trim(), currentJob))
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }

  return unique.join(', ');
}

function extractWorkTitlesFromSection(section: string, currentJob?: string): string[] {
  const titles: string[] = [];
  for (const line of splitWorkExperienceLines(section)) {
    if (/^werkervaring/i.test(line)) continue;
    if (/^van[\s-]*tot\s*$/i.test(line)) continue;
    if (/^opleidingen/i.test(line)) continue;

    const title = extractTitleFromTableLine(line);
    if (!title) continue;
    if (currentJob && titleOverlapsCurrentJob(title, currentJob)) continue;
    if (!titles.some((t) => t.toLowerCase() === title.toLowerCase())) {
      titles.push(title);
    }
  }
  return titles;
}

function resolveMappedWorkExperience(
  mappedWorkExperience: unknown,
  currentJob?: string
): string {
  const rawMapped =
    mappedWorkExperience != null && String(mappedWorkExperience).trim()
      ? parseWorkExperience(stripAssistantArtifacts(String(mappedWorkExperience).trim()))
      : '';

  if (!rawMapped || !isPlausibleWorkExperience(rawMapped)) return '';

  const sanitized = sanitizeWorkExperienceString(rawMapped, currentJob);
  return sanitized && isPlausibleWorkExperience(sanitized) ? sanitized : '';
}

export function resolveWorkExperienceFromIntake(
  mappedWorkExperience: unknown,
  documentText: string,
  options?: { currentJob?: unknown }
): string | undefined {
  const currentJob =
    options?.currentJob != null && String(options.currentJob).trim()
      ? stripAssistantArtifacts(String(options.currentJob).trim())
      : undefined;

  const mapped = resolveMappedWorkExperience(mappedWorkExperience, currentJob);

  if (documentText?.trim()) {
    const section = sliceWorkExperienceSection(documentText);
    const extracted = extractWorkTitlesFromSection(section, currentJob);
    if (extracted.length > 0) {
      return extracted.join(', ');
    }
  }

  return mapped || undefined;
}
