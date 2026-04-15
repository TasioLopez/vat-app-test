import type { CvModel } from '@/types/cv';

export type CvDocKind = 'intake' | 'ad' | 'vgr' | 'other';

export type CvFactExperience = {
  role: string;
  organization?: string;
  period?: string;
  description?: string;
};

export type CvFactEducation = {
  institution: string;
  diploma?: string;
  period?: string;
  description?: string;
};

export type CvFactLanguage = {
  language: string;
  level?: string;
};

export type CvMobilityFacts = {
  driversLicense?: boolean;
  licenseTypes?: string[];
  transport?: string[];
  contractHours?: string;
};

export type CvFacts = {
  personal: Partial<CvModel['personal']> & { title?: string };
  profileHints: string[];
  experienceFacts: CvFactExperience[];
  educationFacts: CvFactEducation[];
  skills: string[];
  languages: CvFactLanguage[];
  interestsHints: string[];
  extraHints: string[];
  mobility: CvMobilityFacts;
  evidence: {
    docsProcessed: number;
    docsWithText: number;
    byKind: Record<CvDocKind, number>;
  };
};

export function emptyCvFacts(): CvFacts {
  return {
    personal: {},
    profileHints: [],
    experienceFacts: [],
    educationFacts: [],
    skills: [],
    languages: [],
    interestsHints: [],
    extraHints: [],
    mobility: {},
    evidence: {
      docsProcessed: 0,
      docsWithText: 0,
      byKind: { intake: 0, ad: 0, vgr: 0, other: 0 },
    },
  };
}

export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

export function cleanTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => cleanText(v)).filter(Boolean);
}

export function normalizeFactLanguages(value: unknown): CvFactLanguage[] {
  if (!Array.isArray(value)) return [];
  const rows = value as Array<Record<string, unknown>>;
  return rows
    .map((row) => ({
      language: cleanText(row?.language),
      level: cleanText(row?.level) || undefined,
    }))
    .filter((row) => Boolean(row.language));
}

export function normalizeFactExperience(value: unknown): CvFactExperience[] {
  if (!Array.isArray(value)) return [];
  const rows = value as Array<Record<string, unknown>>;
  return rows
    .map((row) => ({
      role: cleanText(row?.role),
      organization: cleanText(row?.organization) || undefined,
      period: cleanText(row?.period) || undefined,
      description: cleanText(row?.description) || undefined,
    }))
    .filter((row) => Boolean(row.role));
}

export function normalizeFactEducation(value: unknown): CvFactEducation[] {
  if (!Array.isArray(value)) return [];
  const rows = value as Array<Record<string, unknown>>;
  return rows
    .map((row) => ({
      institution: cleanText(row?.institution),
      diploma: cleanText(row?.diploma) || undefined,
      period: cleanText(row?.period) || undefined,
      description: cleanText(row?.description) || undefined,
    }))
    .filter((row) => Boolean(row.institution));
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function dedupeExperience(values: CvFactExperience[]): CvFactExperience[] {
  const seen = new Set<string>();
  const out: CvFactExperience[] = [];
  for (const item of values) {
    const key = `${item.role}|${item.organization ?? ''}|${item.period ?? ''}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function dedupeEducation(values: CvFactEducation[]): CvFactEducation[] {
  const seen = new Set<string>();
  const out: CvFactEducation[] = [];
  for (const item of values) {
    const key = `${item.institution}|${item.diploma ?? ''}|${item.period ?? ''}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function dedupeLanguages(values: CvFactLanguage[]): CvFactLanguage[] {
  const seen = new Set<string>();
  const out: CvFactLanguage[] = [];
  for (const item of values) {
    const key = `${item.language}|${item.level ?? ''}`.toLowerCase();
    if (!item.language || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
