/** Format ISO-ish date strings for NL print/PDF display (dd-MM-yyyy). */
export function formatIntakeDateNl(value: string | null | undefined): string {
  const raw = (value || '').trim();
  if (!raw) return '';

  // Prefer strict ISO YYYY-MM-DD to avoid timezone shifts.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    return `${iso[3]}-${iso[2]}-${iso[1]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
