import { TP_SPOOR2_SUBSECTIONS } from '@/lib/tp2026/basis-spoor2-begeleiding';

export type TPActivitySelection = { id: string; subText?: string | null };

export type TPActivity = {
  id: string;
  title: string;
  body: string;
};

/** Normalize tp3_activities from DB: support legacy string[] or new { id, subText }[]. */
export function normalizeTp3Activities(raw: unknown): TPActivitySelection[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (raw.every((x): x is string => typeof x === 'string')) {
    return raw.map((id) => ({ id, subText: null }));
  }
  return raw
    .filter(
      (x): x is { id: string; subText?: string | null } =>
        typeof x === 'object' && x !== null && 'id' in x && typeof (x as { id: unknown }).id === 'string'
    )
    .map((x) => ({ id: x.id, subText: x.subText ?? null }));
}

export function getBodyMain(activity: TPActivity): string {
  return activity.body;
}

export const TP_ACTIVITIES: TPActivity[] = TP_SPOOR2_SUBSECTIONS.map(({ id, title, body }) => ({
  id,
  title,
  body,
}));

export default TP_ACTIVITIES;
