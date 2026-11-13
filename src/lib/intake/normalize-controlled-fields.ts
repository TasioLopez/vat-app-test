import { filterAllowedDriversLicenseTypes } from '@/lib/document-analysis/intakeCheckboxText';
import { normalizeDutchLevel } from '@/lib/document-analysis/nullSafeDetails';
import {
  COMPUTER_SKILLS_OPTIONS,
  DRIVERS_LICENSE_TYPE_VALUES,
  filterAllowedTransportTypes,
  getComputerSkillsDefaultDescription,
  normalizeEducationLevel,
} from '@/lib/tp2026/gegevens-field-options';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

function normalizeComputerLevel(raw: string): string {
  const trimmed = raw.trim();
  if (/^[1-5]$/.test(trimmed)) return trimmed;
  const n = parseInt(trimmed, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 5 && String(n) === trimmed) return String(n);

  const lower = trimmed.toLowerCase();
  for (const opt of COMPUTER_SKILLS_OPTIONS) {
    if (opt.label.toLowerCase() === lower) return opt.value;
  }
  // Common free-text synonyms that are not Dutch language levels
  if (lower === 'geen' || lower === 'none') return '1';
  if (lower === 'basis' || lower === 'beginner') return '2';
  if (lower === 'gemiddeld' || lower === 'redelijk' || lower === 'average') return '3';
  if (lower === 'geavanceerd' || lower === 'advanced') return '4';
  if (lower === 'expert') return '5';
  return '';
}

function mentionsWordOrExcel(...parts: string[]): boolean {
  const blob = parts.join(' ').toLowerCase();
  return /\bword\b/.test(blob) || /\bexcel\b/.test(blob);
}

function canonicalizeDriversLicenseTypes(values: string[]): string[] {
  const mapped = values.map((raw) => {
    const trimmed = String(raw).trim();
    if (!trimmed) return trimmed;
    const hit = DRIVERS_LICENSE_TYPE_VALUES.find((v) => v.toLowerCase() === trimmed.toLowerCase());
    return hit || trimmed;
  });
  return filterAllowedDriversLicenseTypes(mapped);
}

function normalizeComputerFields(
  levelRaw: string,
  extraRaw: string
): { computer_skills: string; computer_skills_extra: string } {
  let extra = extraRaw.trim();
  const levelCanonical = normalizeComputerLevel(levelRaw);

  if (levelCanonical) {
    return { computer_skills: levelCanonical, computer_skills_extra: extra };
  }

  const prose = levelRaw.trim();
  const looksLikeProse = Boolean(prose) && !/^[1-5]$/.test(prose);
  if (looksLikeProse && !extra) {
    extra = prose;
  }

  if (mentionsWordOrExcel(prose, extra)) {
    return {
      computer_skills: '3',
      computer_skills_extra: extra || getComputerSkillsDefaultDescription('3'),
    };
  }

  return { computer_skills: '', computer_skills_extra: extra };
}

/**
 * Coerce s17 controlled fields to values the intake UI dropdowns/checkboxes accept.
 * Does not invent rijbewijs B from Auto alone.
 */
export function normalizeIntakeControlledFields(raw: IntakeData): IntakeData {
  const data = ensureIntakeShape(raw);
  const s17 = data.s17;

  const education = normalizeEducationLevel(s17.education_level);
  s17.education_level = education || '';

  s17.dutch_speaking = normalizeDutchLevel(s17.dutch_speaking) || '';
  s17.dutch_writing = normalizeDutchLevel(s17.dutch_writing) || '';
  s17.dutch_reading = normalizeDutchLevel(s17.dutch_reading) || '';

  const computer = normalizeComputerFields(s17.computer_skills, s17.computer_skills_extra);
  s17.computer_skills = computer.computer_skills;
  s17.computer_skills_extra = computer.computer_skills_extra;

  s17.drivers_license_types = canonicalizeDriversLicenseTypes(s17.drivers_license_types);
  s17.transport_types = filterAllowedTransportTypes(s17.transport_types);

  return data;
}
