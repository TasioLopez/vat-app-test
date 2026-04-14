import type { CvEducationItem, CvExperienceItem, CvLanguageItem, CvListItem, CvModel } from '@/types/cv';
import { newCvId, emptyCvModel } from '@/types/cv';
import { formatEducationLevel, parseWorkExperience } from '@/lib/utils';

type EmployeeRow = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type DetailsRow = {
  gender?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  current_job?: string | null;
  work_experience?: string | null;
  education_level?: string | null;
  education_name?: string | null;
  other_employers?: string | null;
  computer_skills?: string | null;
  dutch_speaking?: string | null;
  dutch_writing?: string | null;
  dutch_reading?: string | null;
  drivers_license?: boolean | null;
  /** DB may return string[] or legacy string / JSON string */
  drivers_license_type?: string | string[] | null;
  transport_type?: string | string[] | null;
  contract_hours?: number | null;
};

/**
 * Normalize Postgres/legacy values to string[] (same idea as formatDriversLicense in utils).
 */
export function normalizeStringArrayField(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x).trim()).filter(Boolean);
        }
      } catch {
        /* fall through */
      }
    }
    return s.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function splitList(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function levelLabel(level: string | null | undefined, kind: 'spreek' | 'schrijf' | 'lees'): string | null {
  if (!level?.trim()) return null;
  const map: Record<string, string> = {
    '1': 'Geen',
    '2': 'Matig',
    '3': 'Gemiddeld',
    '4': 'Goed',
    '5': 'Zeer goed',
  };
  const v = map[level] ?? level;
  return `Nederlands (${kind}): ${v}`;
}

/**
 * Build experience rows from work_experience (JSON array or prose) and other_employers.
 */
function seedExperience(details: DetailsRow): CvExperienceItem[] {
  const raw = details.work_experience;
  if (!raw?.trim()) {
    if (details.other_employers?.trim()) {
      return [
        {
          id: newCvId(),
          role: 'Overige werkgevers',
          description: details.other_employers.trim(),
        },
      ];
    }
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => typeof x === 'string' && x.trim())
        .map((line: string) => ({
          id: newCvId(),
          role: line.trim(),
        }));
    }
  } catch {
    // prose
  }

  const joined = parseWorkExperience(raw);
  if (!joined) return [];

  return [
    {
      id: newCvId(),
      role: 'Werkervaring',
      description: joined,
    },
  ];
}

function seedEducation(details: DetailsRow): CvEducationItem[] {
  const level = details.education_level;
  const name = details.education_name;
  if (!level?.trim() && !name?.trim()) return [];
  return [
    {
      id: newCvId(),
      institution: formatEducationLevel(level, name),
      description: '',
    },
  ];
}

function seedSkills(details: DetailsRow): CvListItem[] {
  const parts = splitList(details.computer_skills);
  return parts.map((text) => ({ id: newCvId(), text }));
}

function seedLanguages(details: DetailsRow): CvLanguageItem[] {
  const lines: string[] = [];
  const sp = levelLabel(details.dutch_speaking, 'spreek');
  const wr = levelLabel(details.dutch_writing, 'schrijf');
  const re = levelLabel(details.dutch_reading, 'lees');
  if (sp) lines.push(sp);
  if (wr) lines.push(wr);
  if (re) lines.push(re);
  if (lines.length === 0) return [];
  return lines.map((line) => ({
    id: newCvId(),
    language: line,
  }));
}

function seedExtra(details: DetailsRow): string {
  const bits: string[] = [];
  if (details.drivers_license) {
    const licenseTypes = normalizeStringArrayField(details.drivers_license_type);
    const t = licenseTypes.length
      ? `Rijbewijs: ${licenseTypes.join(', ')}`
      : 'Rijbewijs: ja';
    bits.push(t);
  }
  const transport = normalizeStringArrayField(details.transport_type);
  if (transport.length) {
    bits.push(`Vervoer: ${transport.join(', ')}`);
  }
  if (details.contract_hours != null && details.contract_hours > 0) {
    bits.push(`Contracturen: ${details.contract_hours} uur per week`);
  }
  return bits.join('\n');
}

function seedProfile(employee: EmployeeRow, details: DetailsRow): string {
  const name = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
  const job = details.current_job?.trim();
  const edu = formatEducationLevel(details.education_level, details.education_name);
  if (!name && !job) return '';
  const parts: string[] = [];
  if (job) {
    parts.push(`${name || 'Kandidaat'} is ${job}.`);
  }
  if (edu && edu !== '—') {
    parts.push(`Opleiding: ${edu}.`);
  }
  return parts.join(' ');
}

/**
 * Map werknemer rows into a fresh CvModel for first-time CV creation.
 */
export function seedCvModelFromEmployee(employee: EmployeeRow, details: DetailsRow | null): CvModel {
  const base = emptyCvModel();
  if (!details) {
    base.personal.fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ') || '';
    base.personal.email = employee.email?.trim() || '';
    return base;
  }

  base.personal.fullName =
    [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim() || '';
  base.personal.title = details.current_job?.trim() || '';
  base.personal.email = employee.email?.trim() || '';
  base.personal.phone = details.phone?.trim() || '';
  base.personal.dateOfBirth = details.date_of_birth?.trim() || undefined;
  base.personal.location = '';

  base.profile = seedProfile(employee, details);
  base.experience = seedExperience(details);
  base.education = seedEducation(details);
  base.skills = seedSkills(details);
  base.languages = seedLanguages(details);
  base.interests = [];
  base.extra = seedExtra(details);

  return base;
}
