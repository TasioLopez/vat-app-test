/**
 * Parse contract hours from UI / TP / autofill values.
 * Accepts decimals with `.` or `,` (e.g. 36.5 / 36,5). Returns null when empty/invalid.
 */
export function parseContractHours(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;

  let trimmed = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!trimmed || trimmed === '.') return null;
  // "36." while typing / on blur → treat as 36
  if (trimmed.endsWith('.')) trimmed = trimmed.slice(0, -1);
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(trimmed)) return null;

  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** True while the user is mid-typing a decimal (e.g. "36." or "36,"). */
export function isIncompleteContractHoursInput(raw: string): boolean {
  const trimmed = raw.trim().replace(/\s+/g, '');
  return trimmed === '.' || trimmed === ',' || /,\s*$/.test(trimmed) || /\.\s*$/.test(trimmed);
}
