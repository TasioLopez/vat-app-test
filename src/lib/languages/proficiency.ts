/** Structured non-Dutch language proficiency (intake + employee_details). */

import { normalizeDutchLevel } from '@/lib/document-analysis/nullSafeDetails';
import { DUTCH_LANGUAGE_OPTIONS } from '@/lib/tp2026/gegevens-field-options';

export type LanguageProficiency = {
  language: string;
  level: string;
};

/** Same 4-level scale as Dutch skills (paper G/R/O maps here). */
export const OTHER_LANGUAGE_LEVEL_OPTIONS = DUTCH_LANGUAGE_OPTIONS;

/** Suggested names for the UI; free text remains allowed. */
export const SUGGESTED_OTHER_LANGUAGES = [
  'Engels',
  'Turks',
  'Arabisch',
  'Berbers',
  'Duits',
  'Frans',
  'Spaans',
  'Pools',
  'Portugees',
  'Italiaans',
  'Russisch',
  'Roemeens',
] as const;

const DUTCH_NAME_RE = /^(nederlands|dutch|nl)$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function isDutchLanguageName(name: string): boolean {
  return DUTCH_NAME_RE.test(name.trim());
}

/** Normalize a non-Dutch level onto Goed|Voldoende|Matig|Geen when possible. */
export function normalizeOtherLanguageLevel(raw: unknown): string {
  const fromDutch = normalizeDutchLevel(raw);
  if (fromDutch) return fromDutch;

  const trimmed = str(raw);
  if (!trimmed) return '';

  // Numeric "niveau 3" / "3" → map onto the 4-level Dutch scale (client "level 3").
  const numeric = trimmed.match(/^(?:niveau\s*)?([1-5])$/i);
  if (numeric) {
    const n = Number(numeric[1]);
    if (n >= 5) return 'Goed';
    if (n === 4) return 'Goed';
    if (n === 3) return 'Voldoende';
    if (n === 2) return 'Matig';
    return 'Geen';
  }

  // CEFR A1–C2 → approximate Dutch scale
  const cefr = trimmed.toUpperCase();
  if (cefr === 'C2' || cefr === 'C1') return 'Goed';
  if (cefr === 'B2' || cefr === 'B1') return 'Voldoende';
  if (cefr === 'A2' || cefr === 'A1') return 'Matig';

  // Keep free-text level when it does not map (legacy "verstaanbaar, schriftelijk minder goed")
  return trimmed;
}

export function normalizeLanguageProficiency(raw: unknown): LanguageProficiency | null {
  const o = asRecord(raw);
  const language = str(o.language ?? o.name ?? o.taal);
  if (!language || isDutchLanguageName(language)) return null;
  const level = normalizeOtherLanguageLevel(o.level ?? o.niveau ?? o.vaardigheid);
  // Prefer omit over storing Geen / empty for other languages
  if (!level || level === 'Geen') return null;
  return { language, level };
}

export function normalizeLanguageProficiencyList(raw: unknown): LanguageProficiency[] {
  if (!Array.isArray(raw)) return [];
  const out: LanguageProficiency[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = normalizeLanguageProficiency(item);
    if (!row) continue;
    const key = row.language.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * Best-effort parse of legacy free-text `other_languages`
 * (e.g. "Berbers goed; Turks matig" or "Engels verstaanbaar, schriftelijk minder goed").
 */
export function parseOtherLanguagesFreeText(raw: string | null | undefined): LanguageProficiency[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];

  const chunks = text
    .split(/\s*;\s*|\n+/)
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter(Boolean);

  const out: LanguageProficiency[] = [];
  for (const chunk of chunks) {
    const match = chunk.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      if (isDutchLanguageName(chunk)) continue;
      // Bare language name without level — skip (cannot invent level)
      continue;
    }
    const language = match[1]!.trim();
    const levelRaw = match[2]!.trim();
    if (!language || isDutchLanguageName(language)) continue;
    const level = normalizeOtherLanguageLevel(levelRaw);
    if (!level || level === 'Geen') {
      // Keep multi-word free-text levels that don't map (e.g. "verstaanbaar, schriftelijk minder goed")
      if (levelRaw && levelRaw.toLowerCase() !== 'geen') {
        out.push({ language, level: levelRaw });
      }
      continue;
    }
    out.push({ language, level });
  }
  return normalizeLanguageProficiencyList(out);
}

/** Format for display / print / VGR context. */
export function formatLanguageProficiencyList(
  rows: LanguageProficiency[] | null | undefined
): string {
  if (!rows?.length) return '';
  return rows
    .map((row) => {
      const language = row.language.trim();
      const level = row.level.trim();
      if (!language) return '';
      return level ? `${language} (${level})` : language;
    })
    .filter(Boolean)
    .join('; ');
}

/** Dual-write helper: structured list → legacy free-text string. */
export function languagesToOtherLanguagesString(
  rows: LanguageProficiency[] | null | undefined
): string {
  if (!rows?.length) return '';
  return rows
    .map((row) => {
      const language = row.language.trim();
      const level = row.level.trim();
      if (!language) return '';
      return level ? `${language} ${level.toLowerCase()}` : language;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Merge AI/glyph-detected languages into an existing list without overwriting
 * languages that already have a manual level.
 */
export function mergeLanguageProficiencyLists(
  existing: LanguageProficiency[] | null | undefined,
  incoming: LanguageProficiency[] | null | undefined
): LanguageProficiency[] {
  const base = normalizeLanguageProficiencyList(existing ?? []);
  const byKey = new Map(base.map((row) => [row.language.toLowerCase(), row]));
  for (const row of normalizeLanguageProficiencyList(incoming ?? [])) {
    const key = row.language.toLowerCase();
    if (byKey.has(key)) continue;
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

export function languageProficiencySubject(language: string): string {
  const key = language.trim().toLowerCase();
  const map: Record<string, string> = {
    berbers: 'De Berberse taal',
    engels: 'Het Engels',
    arabisch: 'Het Arabisch',
    turks: 'De Turkse taal',
    duits: 'De Duitse taal',
    frans: 'De Franse taal',
    spaans: 'De Spaanse taal',
    pools: 'Het Pools',
    portugees: 'Het Portugees',
    italiaans: 'Het Italiaans',
    russisch: 'Het Russisch',
    roemeens: 'Het Roemeens',
  };
  return map[key] ?? `Het ${language.trim()}`;
}

/** Deterministic TP alinea-2 sentences from structured language rows. */
export function languageProficiencySentences(
  rows: LanguageProficiency[] | null | undefined
): string[] {
  return (rows ?? [])
    .map((row) => {
      const language = row.language.trim();
      const level = row.level.trim();
      if (!language || !level) return '';
      const subject = languageProficiencySubject(language);
      return `${subject} beheerst werknemer ${level.toLowerCase()}.`;
    })
    .filter(Boolean);
}
