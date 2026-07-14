/** Intake "Algemene informatie" table extraction (opleidingen + werkervaring). */
import { parseWorkExperience } from '@/lib/utils';
import { stripAssistantArtifacts } from '@/lib/document-analysis/stripAssistantArtifacts';
import {
  isEducationCertification,
  isInvalidEducationLevelToken,
  normalizeEducationLevel,
  parseIntakeEducationRows,
  repairEmployeeEducationFields,
  resolveHighestFinishedEducation,
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
  /\b(medewerker|teamleider|assistent|thuiszorg|verzorgende|magazijn|productie|logistiek|administratief|kassier|winkel|keuken|schoonmaak|operator|monteur|chauffeur|begeleider|planner|passagiers|supervisor)\b/i;

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
  'planner',
  'passagiers',
  'supervisor',
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

export function resolveIntakeEducationFields(
  mapped: { education_level?: unknown; education_name?: unknown },
  documentText: string
): { education_level?: string; education_name?: string } {
  if (documentText?.trim()) {
    const section = sliceEducationSection(documentText);
    const fromDocument = resolveHighestFinishedEducation(parseIntakeEducationRows(section));
    if (fromDocument.education_level) {
      return repairEmployeeEducationFields(
        fromDocument.education_level,
        fromDocument.education_name ?? mapped.education_name
      );
    }
    return {};
  }

  const repaired = repairEmployeeEducationFields(mapped.education_level, mapped.education_name);
  if (repaired.education_level) return repaired;

  if (mapped.education_level != null && !isInvalidEducationLevelToken(mapped.education_level)) {
    const normalized = normalizeEducationLevel(mapped.education_level);
    if (normalized) {
      return repairEmployeeEducationFields(normalized, mapped.education_name);
    }
  }

  return {};
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

/** Extract job titles from sectie 13 "Werkverleden" narrative when table has only employer/duration. */
export function extractWorkExperienceFromSectie13(documentText: string, currentJob?: string): string[] {
  if (!documentText?.trim()) return [];

  const titles: string[] = [];
  const seen = new Set<string>();

  const addTitle = (raw: string) => {
    const cleaned = sanitizeWorkExperiencePart(raw.trim(), currentJob);
    if (!cleaned || cleaned.length < 3) return;
    if (!looksLikeJobTitle(cleaned)) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    titles.push(cleaned);
  };

  const andereFuncties = documentText.match(
    /andere\s+functies\s+gedaan\s+([^.;\n]+)/i
  );
  if (andereFuncties?.[1]) {
    for (const part of andereFuncties[1].split(/[,;]+/)) {
      addTitle(part);
    }
  }

  const sectie13Match = documentText.match(
    /(?:sectie\s*13|werkverleden)[\s\S]{0,800}/i
  );
  if (sectie13Match) {
    const functieLines = sectie13Match[0].match(/[^\n.]*functie[^\n.]*/gi) ?? [];
    for (const line of functieLines) {
      const afterColon = line.split(/:\s*/).pop() ?? line;
      for (const part of afterColon.split(/[,;]+/)) {
        if (/\b(?:assistent|planner|medewerker|operator|supervisor|passagiers)\b/i.test(part)) {
          addTitle(part);
        }
      }
    }
  }

  return titles;
}

function mergeWorkExperienceTitles(...sources: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const source of sources) {
    for (const title of source) {
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(title);
    }
  }
  return merged;
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
    const fromTable = extractWorkTitlesFromSection(section, currentJob);
    const fromSectie13 =
      fromTable.length === 0
        ? extractWorkExperienceFromSectie13(documentText, currentJob)
        : [];

    const merged = mergeWorkExperienceTitles(fromTable, fromSectie13);
    if (merged.length > 0) {
      return merged.join(', ');
    }
  }

  return mapped || undefined;
}
