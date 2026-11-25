/**
 * Helpers for VGR source selection UI: prefer document_date, then uploaded_at.
 */

export type VgrSourceListItem = {
  id: string;
  type: string | null;
  name: string | null;
  uploaded_at: string | null;
  document_date?: string | null;
};

function dayKey(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/** Newest first: document_date, then uploaded_at, then name. */
export function sortSourcesForSelection<T extends VgrSourceListItem>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    const da = dayKey(a.document_date);
    const db = dayKey(b.document_date);
    if (da && db && da !== db) return db.localeCompare(da);
    if (db && !da) return 1;
    if (da && !db) return -1;
    const ua = String(a.uploaded_at || '');
    const ub = String(b.uploaded_at || '');
    if (ua !== ub) return ub.localeCompare(ua);
    return String(a.name || '').localeCompare(String(b.name || ''), 'nl');
  });
}

/**
 * For each app type, pick the single newest document id (by document_date / upload).
 * Useful as a default selection when versions exist.
 */
export function pickLatestIdsByType(docs: VgrSourceListItem[]): string[] {
  const sorted = sortSourcesForSelection(docs);
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const d of sorted) {
    const t = String(d.type || '').toLowerCase().trim() || 'extra';
    if (seen.has(t)) continue;
    seen.add(t);
    ids.push(d.id);
  }
  return ids;
}
