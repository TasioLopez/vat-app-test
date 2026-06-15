/** Shared date and doctor formatting for TP section builders. */

export function nlDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function stripDoctorRolePrefix(name: string): string {
  return name
    .replace(/^(Verzekeringsarts|Bedrijfsarts|Arts|Anios)\s+/i, '')
    .trim();
}

/**
 * Phrase for FML / medisch spreekuur intros (screenshot 1 style).
 * Preserves supervisie sentences verbatim; otherwise builds "arts … werkend onder supervisie van arts …".
 */
export function buildArtsPhrase(occupational_doctor_org: string | null | undefined): string {
  const raw = (occupational_doctor_org || '').trim();
  if (!raw) return 'arts [naam] werkend onder supervisie van arts [supervisor]';

  if (/werkend onder supervisie van/i.test(raw)) {
    return raw.replace(/\s+/g, ' ').trim();
  }

  const match = raw.match(/^(.+?)\s*,?\s*werkend onder supervisie van\s*:?\s*(.+)$/i);
  if (match) {
    const primary = stripDoctorRolePrefix(match[1].trim());
    const supervisor = stripDoctorRolePrefix(match[2].trim());
    return `arts ${primary} werkend onder supervisie van arts ${supervisor}`;
  }

  const name = stripDoctorRolePrefix(raw.replace(/,?\s*intern gebruik bij[^.]*$/i, '').trim());
  return name ? `arts ${name}` : 'arts [naam]';
}

export function isMaleGender(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'male' || g === 'man' || g === 'm' || g === 'mannelijk';
}

export function isFemaleGender(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'female' || g === 'vrouw' || g === 'f' || g === 'vrouwelijk';
}
