import { formatNLDate, type VGRData } from '@/lib/vgr/schema';

/** "1 januari 2026 tot en met 31 maart 2026" (or adviser override). */
export function vgrPeriodeText(data: VGRData): string {
  const override = String(data.body?.periode_tekst_override || '').trim();
  if (override) return override;
  const start = data.vgr_meta?.period_start;
  const end = data.vgr_meta?.period_end;
  if (!start && !end) return '';
  if (start && end) return `${formatNLDate(start)} tot en met ${formatNLDate(end)}`;
  if (start) return `vanaf ${formatNLDate(start)}`;
  return `tot en met ${formatNLDate(end)}`;
}

/** Short "van … tot …" used in planning vervolg lines. */
export function vgrVervolgPeriodeText(van?: string | null, tot?: string | null): string {
  if (!van && !tot) return '';
  if (van && tot) return `${formatNLDate(van)} tot ${formatNLDate(tot)}`;
  if (van) return `vanaf ${formatNLDate(van)}`;
  return `tot ${formatNLDate(tot)}`;
}
