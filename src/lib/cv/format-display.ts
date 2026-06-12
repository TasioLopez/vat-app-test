import { formatComputerSkills } from '@/lib/utils';
import type { CvLanguageItem, CvLocale } from '@/types/cv';

const COMPUTER_SKILLS_EN: Record<string, string> = {
  '1': 'None',
  '2': 'Basic (email, browsing)',
  '3': 'Intermediate (Word, Excel)',
  '4': 'Advanced (multiple applications)',
  '5': 'Expert (IT-related skills)',
};

const DUTCH_LEVEL_NL: Record<string, string> = {
  '1': 'Geen',
  '2': 'Matig',
  '3': 'Gemiddeld',
  '4': 'Goed',
  '5': 'Zeer goed',
  goed: 'Goed',
  matig: 'Matig',
  onvoldoende: 'Onvoldoende',
  'niet goed': 'Niet goed',
};

const DUTCH_LEVEL_EN: Record<string, string> = {
  '1': 'None',
  '2': 'Moderate',
  '3': 'Average',
  '4': 'Good',
  '5': 'Very good',
  goed: 'Good',
  matig: 'Moderate',
  onvoldoende: 'Insufficient',
  'niet goed': 'Not good',
};

const KIND_NL: Record<string, string> = {
  spreek: 'spreek',
  schrijf: 'schrijf',
  lees: 'lees',
};

const KIND_EN: Record<string, string> = {
  spreek: 'speaking',
  schrijf: 'writing',
  lees: 'reading',
};

function normalizeLevelKey(value: string): string {
  const trimmed = value.trim();
  const digitMatch = trimmed.match(/^(\d)/);
  if (digitMatch) return digitMatch[1];
  const dashMatch = trimmed.match(/^\d+\s*-\s*(.+)$/);
  if (dashMatch) return dashMatch[1].trim().toLowerCase();
  return trimmed.toLowerCase();
}

/** Format computer skills for CV display (NL or EN). */
export function formatCvComputerSkills(
  skillLevel: string | number | null | undefined,
  locale: CvLocale = 'nl'
): string {
  if (!skillLevel) return '—';
  const level = String(skillLevel).trim();
  if (locale === 'en') {
    return COMPUTER_SKILLS_EN[level] ?? formatComputerSkills(skillLevel);
  }
  return formatComputerSkills(skillLevel);
}

/** Normalize a Dutch language proficiency value to a display label. */
export function formatCvDutchLanguageLevel(
  value: string | null | undefined,
  locale: CvLocale = 'nl'
): string | null {
  if (!value?.trim()) return null;
  const key = normalizeLevelKey(value);
  const map = locale === 'en' ? DUTCH_LEVEL_EN : DUTCH_LEVEL_NL;
  return map[key] ?? value.trim();
}

/** Format language + optional level for display. */
export function formatCvLanguageEntry(
  language: string,
  level?: string | null,
  locale: CvLocale = 'nl'
): string {
  const lang = language.trim();
  if (!level?.trim()) return lang;
  return `${lang} — ${level.trim()}`;
}

/** Build composed Dutch level string from speak/write/read values. */
export function formatCvDutchLanguageLevels(
  speaking: string | null | undefined,
  writing: string | null | undefined,
  reading: string | null | undefined,
  locale: CvLocale = 'nl'
): string | null {
  const kinds = locale === 'en'
    ? ([['spreek', speaking], ['schrijf', writing], ['lees', reading]] as const)
    : ([['spreek', speaking], ['schrijf', writing], ['lees', reading]] as const);
  const kindLabels = locale === 'en' ? KIND_EN : KIND_NL;
  const parts: string[] = [];
  for (const [kind, val] of kinds) {
    const label = formatCvDutchLanguageLevel(val, locale);
    if (label) parts.push(`${kindLabels[kind]}: ${label}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Upgrade raw numeric skill bullet to descriptive label. */
export function coerceSkillBulletText(text: string, locale: CvLocale = 'nl'): string {
  const trimmed = text.trim();
  if (/^[1-5]$/.test(trimmed)) {
    return formatCvComputerSkills(trimmed, locale);
  }
  return text;
}

const NUMERIC_SKILL_RE = /^[1-5]$/;

/** Deduplicate legacy language rows (Nederlands + Nederlands (spreek: …) duplicates). */
export function dedupeCvLanguages(languages: CvLanguageItem[]): CvLanguageItem[] {
  const primary = languages.find(
    (l) => l.language.trim().toLowerCase() === 'nederlands' && l.level?.trim()
  );
  const duplicates = languages.filter((l) =>
    /^Nederlands\s*\(/i.test(l.language.trim())
  );
  if (primary && duplicates.length > 0) {
    return languages.filter((l) => !duplicates.includes(l));
  }
  if (!primary && duplicates.length > 0) {
    const levels = duplicates
      .map((l) => {
        const m = l.language.match(/^Nederlands\s*\((.+)\)$/i);
        return m?.[1]?.trim();
      })
      .filter(Boolean);
    const rest = languages.filter((l) => !duplicates.includes(l));
    if (levels.length > 0) {
      return [
        ...rest,
        {
          id: duplicates[0].id,
          language: 'Nederlands',
          level: levels.join(', '),
        },
      ];
    }
  }
  return languages;
}

/** Backfill digitalSkills from lone numeric skill bullets; strip them from skills. */
export function coerceCvModelDisplay(model: {
  skills: { id: string; text: string }[];
  languages: CvLanguageItem[];
  digitalSkills?: string;
}): { digitalSkills?: string; skills: { id: string; text: string }[]; languages: CvLanguageItem[] } {
  let digitalSkills = model.digitalSkills?.trim() || undefined;

  const rawNumericSkills = model.skills.filter((s) => NUMERIC_SKILL_RE.test(s.text.trim()));
  if (!digitalSkills && rawNumericSkills.length === 1) {
    digitalSkills = formatCvComputerSkills(rawNumericSkills[0].text.trim());
  }

  const skills = model.skills
    .filter((s) => !NUMERIC_SKILL_RE.test(s.text.trim()))
    .map((s) => ({
      ...s,
      text: coerceSkillBulletText(s.text),
    }));

  return {
    digitalSkills,
    skills,
    languages: dedupeCvLanguages(model.languages),
  };
}
