import {
  isSpoor2NotitieEligible,
  TP_SPOOR2_SUBSECTIONS,
} from '@/lib/tp2026/basis-spoor2-begeleiding';
import type { TP2026Bijlage1Phase } from '@/lib/tp2026/schema';

export type TPActivitySelection = { id: string; subText?: string | null };

export type TPActivity = {
  id: string;
  title: string;
  body: string;
  subTextTemplates?: [string, string, string];
};

export { isSpoor2NotitieEligible };

export const SPOOR2_DETACHERING_ID = 'detachering';

/** Default Spoor 2 subsection selections for editor/persist. */
export function buildDefaultSpoor2Selections(options?: {
  excludeDetachering?: boolean;
}): TPActivitySelection[] {
  return TP_SPOOR2_SUBSECTIONS.filter(
    (s) => !(options?.excludeDetachering && s.id === SPOOR2_DETACHERING_ID)
  ).map((s) => ({ id: s.id, subText: null }));
}

export function applyExWerknemerSpoor2Rule(
  selections: TPActivitySelection[],
  isExWerknemer: boolean
): TPActivitySelection[] {
  if (!isExWerknemer) return selections;
  return selections.filter((s) => s.id !== SPOOR2_DETACHERING_ID);
}

/**
 * Materialize tp3_activities when ex-werknemer is true.
 * null/undefined raw → explicit all-subsection list minus detachering.
 */
export function materializeSpoor2ForExWerknemer(
  currentRaw: unknown,
  isExWerknemer: boolean
): TPActivitySelection[] | null {
  if (!isExWerknemer) return null;
  if (currentRaw === null || currentRaw === undefined) {
    return buildDefaultSpoor2Selections({ excludeDetachering: true });
  }
  return applyExWerknemerSpoor2Rule(resolveSpoor2Selections(currentRaw), true);
}

export const BIJLAGE1_DETACHERING_NAME = 'Detachering onderzoeken';

/** Remove Detachering from Bijlage 1 phases so it returns to Beschikbare activiteiten. */
export function applyExWerknemerBijlage1Rule(
  phases: TP2026Bijlage1Phase[],
  isExWerknemer: boolean
): TP2026Bijlage1Phase[] {
  if (!isExWerknemer || !Array.isArray(phases)) return phases;
  return phases.map((phase) => ({
    ...phase,
    activities: (phase.activities ?? []).filter((a) => a.name !== BIJLAGE1_DETACHERING_NAME),
  }));
}

/** Truncate template text for notitie dropdown labels. */
export function formatSpoor2NotitieLabel(text: string, maxLen = 55): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  const slice = cleaned.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 20 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

/** Strip notitie from subsections that are no longer eligible (legacy saved data). */
export function sanitizeSpoor2Selections(selections: TPActivitySelection[]): TPActivitySelection[] {
  return selections.map((s) => ({
    id: s.id,
    subText: isSpoor2NotitieEligible(s.id) ? (s.subText ?? null) : null,
  }));
}

/** Normalize tp3_activities from DB: support legacy string[] or new { id, subText }[]. */
export function normalizeTp3Activities(raw: unknown): TPActivitySelection[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (raw.every((x): x is string => typeof x === 'string')) {
    return sanitizeSpoor2Selections(raw.map((id) => ({ id, subText: null })));
  }
  return sanitizeSpoor2Selections(
    raw
      .filter(
        (x): x is { id: string; subText?: string | null } =>
          typeof x === 'object' && x !== null && 'id' in x && typeof (x as { id: unknown }).id === 'string'
      )
      .map((x) => ({ id: x.id, subText: x.subText ?? null }))
  );
}

/**
 * Effective Spoor 2 selections for preview/editor.
 * null/undefined → all subsections (legacy full-document default).
 * [] → explicitly none selected (Toelichting only).
 */
export function resolveSpoor2Selections(raw: unknown): TPActivitySelection[] {
  if (raw === null || raw === undefined) {
    return TP_SPOOR2_SUBSECTIONS.map((s) => ({ id: s.id, subText: null }));
  }
  if (Array.isArray(raw) && raw.length === 0) {
    return [];
  }
  const normalized = normalizeTp3Activities(raw);
  if (normalized.length > 0) return normalized;
  return TP_SPOOR2_SUBSECTIONS.map((s) => ({ id: s.id, subText: null }));
}

export function getBodyMain(activity: TPActivity): string {
  return activity.body;
}

export const TP_ACTIVITIES: TPActivity[] = TP_SPOOR2_SUBSECTIONS.map(({ id, title, body, subTextTemplates }) => ({
  id,
  title,
  body,
  subTextTemplates,
}));

export default TP_ACTIVITIES;
