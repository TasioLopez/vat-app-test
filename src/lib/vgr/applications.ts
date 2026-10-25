import { VGR_APPLICATION_CAVEATS } from '@/lib/vgr/content';
import { monthKeyFromDate, type VGRApplication } from '@/lib/vgr/schema';

export function groupApplicationsByMonth(apps: VGRApplication[]): { monthKey: string; items: VGRApplication[] }[] {
  const map = new Map<string, VGRApplication[]>();
  for (const a of apps) {
    const key = a.month_key || monthKeyFromDate(a.date) || 'onbekend';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, items]) => ({
      monthKey,
      items: [...items].sort((x, y) => (x.date || '').localeCompare(y.date || '')),
    }));
}

/** "type, functie, organisatie, status" — the 05 line format. */
export function applicationLine(a: VGRApplication): string {
  return [a.type, a.functie, a.organisatie, a.status].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
}

/** Static caveat sentences from template 05 that apply to the current list. */
export function activeApplicationCaveats(apps: VGRApplication[]): string[] {
  const out: string[] = [VGR_APPLICATION_CAVEATS.planning];
  if (apps.some((a) => a.status === 'te zwaar')) out.push(VGR_APPLICATION_CAVEATS.teZwaar);
  if (apps.some((a) => /intern/i.test(`${a.type} ${a.functie} ${a.organisatie} ${a.note}`))) {
    out.push(VGR_APPLICATION_CAVEATS.intern);
  }
  if (apps.length > 0) out.push(VGR_APPLICATION_CAVEATS.voorwaarden);
  return out;
}
