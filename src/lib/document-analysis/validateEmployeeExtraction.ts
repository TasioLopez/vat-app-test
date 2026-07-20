import {
  isEducationCertification,
  isInvalidEducationLevelToken,
  normalizeEducationLevel,
} from '@/lib/tp2026/gegevens-field-options';
import type { ValidationResult } from './runStructuredExtraction';

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function normalizeTitleText(text: string): string {
  return text.trim().toLowerCase();
}

function titleOverlapsCurrentJob(title: string, currentJob: string): boolean {
  const t = normalizeTitleText(title);
  const c = normalizeTitleText(currentJob);
  if (!t || !c) return false;
  if (t === c) return true;
  if (c.includes(t) || t.includes(c)) return true;
  const prefix = t.split(/\s+/).slice(0, 4).join(' ');
  return prefix.length >= 8 && c.includes(prefix);
}

function isLikelyWrongReferent(out: Record<string, unknown>): boolean {
  const fn = String(out.referent_function ?? '').toLowerCase();
  const hasContact = isPresent(out.referent_phone) || isPresent(out.referent_email);
  if (hasContact) return false;
  return fn.includes('arbeidsdeskundig') || fn.includes('bedrijfsarts');
}

function validateWorkExperience(workExperience: unknown): string[] {
  const errors: string[] = [];
  if (!isPresent(workExperience)) return errors;

  const raw = String(workExperience).trim();

  if (/heeft\s+ook\s+wel\s+andere\s+functies/i.test(raw)) {
    errors.push('work_experience mag geen narratieve tekst bevatten — alleen functietitels');
  }

  for (const part of raw.split(/[,;]+/)) {
    const title = part.trim();
    if (!title || title.length < 3) continue;
    if (/^\d+\+?\s*jaar$/i.test(title)) {
      errors.push('work_experience mag geen pure duur/jaar-waarden bevatten');
    }
  }

  return errors;
}

/** Remove titles that overlap current_job (deterministic; avoids Pass B vision retries). */
export function stripCurrentJobFromWorkExperience(
  workExperience: unknown,
  currentJob?: unknown
): string | null {
  if (!isPresent(workExperience)) return null;
  const current = currentJob != null ? String(currentJob).trim() : '';
  const parts = String(workExperience)
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const kept = current
    ? parts.filter((title) => !titleOverlapsCurrentJob(title, current))
    : parts;

  if (kept.length === 0) return null;
  return kept.join(', ');
}

function validateEducation(
  level: unknown,
  name: unknown
): string[] {
  const errors: string[] = [];
  if (!isPresent(level)) return errors;

  const levelStr = String(level).trim();
  if (isInvalidEducationLevelToken(levelStr)) {
    errors.push(`education_level "${levelStr}" is geen geldig opleidingsniveau`);
  }
  if (isEducationCertification(levelStr)) {
    errors.push(`education_level "${levelStr}" is een certificaat, geen schooling`);
  }
  if (!normalizeEducationLevel(levelStr)) {
    errors.push(`education_level "${levelStr}" kon niet genormaliseerd worden`);
  }

  if (isPresent(name)) {
    const nameStr = String(name).trim();
    if (isEducationCertification(nameStr)) {
      errors.push('education_name mag geen certificaat zijn (VCA, etc.)');
    }
    if (nameStr.toLowerCase() === levelStr.toLowerCase()) {
      errors.push('education_name mag niet identiek zijn aan education_level');
    }
  }

  return errors;
}

export function validateIntakeCoreExtraction(
  result: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];

  const hasReferent =
    isPresent(result.referent_first_name) ||
    isPresent(result.referent_last_name) ||
    isPresent(result.referent_function) ||
    isPresent(result.referent_phone) ||
    isPresent(result.referent_email);

  if (hasReferent) {
    if (!isPresent(result.referent_first_name) || !isPresent(result.referent_last_name)) {
      errors.push('referent_first_name en referent_last_name zijn verplicht wanneer referent-gegevens aanwezig zijn');
    }
    if (isLikelyWrongReferent(result)) {
      errors.push('referent_* lijkt bedrijfsarts/AD te zijn — alleen sectie 4 contactpersoon');
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateIntakeAlgemeneInfoExtraction(
  result: Record<string, unknown>,
  _options?: { currentJob?: unknown }
): ValidationResult {
  const errors: string[] = [];

  errors.push(...validateEducation(result.education_level, result.education_name));
  // work_experience overlap with current_job is stripped post-parse — not a hard retry.
  // Missing dutch_speaking / computer_skills → soft warnings via incomplete.ts.
  errors.push(...validateWorkExperience(result.work_experience));

  return { ok: errors.length === 0, errors };
}

export function validateMergedIntakeExtraction(
  merged: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];

  errors.push(...validateWorkExperience(merged.work_experience));

  const core = validateIntakeCoreExtraction(merged);
  const s17 = validateIntakeAlgemeneInfoExtraction(merged, { currentJob: merged.current_job });

  errors.push(...core.errors, ...s17.errors);

  return { ok: errors.length === 0, errors };
}
