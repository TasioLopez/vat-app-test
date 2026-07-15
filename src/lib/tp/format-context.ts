/** Shared date and doctor formatting for TP section builders. */

export const DOCTOR_ROLE_PREFIXES = [
  'Verzekeringsarts',
  'Bedrijfsarts',
  'Arts',
  'Anios',
] as const;

export type DoctorRole = 'Arts' | 'Anios' | 'BA' | 'VA';

const DOCTOR_ROLE_PREFIX: Record<DoctorRole, string> = {
  Arts: 'Arts',
  Anios: 'Anios',
  BA: 'Bedrijfsarts',
  VA: 'Verzekeringsarts',
};

/** Format a doctor name with role prefix when not already prefixed. */
export function formatDoctorWithRole(name: string, role?: DoctorRole | null): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (/werkend onder supervisie van/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ').trim();
  }
  if (hasDoctorRolePrefix(trimmed)) return trimmed;
  if (role && DOCTOR_ROLE_PREFIX[role]) return `${DOCTOR_ROLE_PREFIX[role]} ${trimmed}`;
  return trimmed;
}

/**
 * Combine primary doctor + OSV supervisor into a supervisie phrase.
 * Preserves verbatim text when supervisie is already present.
 */
export function buildSupervisiePhrase(
  primaryName: string,
  primaryRole?: DoctorRole | null,
  osvName?: string | null,
  osvRole?: DoctorRole | null
): string | undefined {
  const raw = primaryName.trim();
  if (!raw) return undefined;
  if (/werkend onder supervisie van/i.test(raw)) {
    return raw.replace(/\s+/g, ' ').trim();
  }

  const osv = (osvName || '').trim();
  const primary = formatDoctorWithRole(raw, primaryRole);
  if (!osv) return primary;

  const supervisor = formatDoctorWithRole(osv, osvRole ?? 'BA');
  return `${primary} werkend onder supervisie van ${supervisor}`;
}

export function nlDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function hasDoctorRolePrefix(value: string): boolean {
  const trimmed = value.trim();
  return DOCTOR_ROLE_PREFIXES.some((prefix) =>
    trimmed.toLowerCase().startsWith(`${prefix.toLowerCase()} `)
  );
}

export function extractDoctorRolePrefix(value: string): string | null {
  const trimmed = value.trim();
  for (const prefix of DOCTOR_ROLE_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
      return prefix;
    }
  }
  return null;
}

export function cleanDoctorOrgRaw(raw: string): string {
  let cleaned = raw.trim();
  if (/werkend onder supervisie van/i.test(cleaned)) {
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  cleaned = cleaned.replace(/\s*-?\s*BIG\s*(nr\.?|nummer)?\s*[\d\s]+/gi, '');
  cleaned = cleaned.replace(/\s*-?\s*Bedrijfsarts\s*$/i, '');
  cleaned = cleaned.replace(/,?\s*intern gebruik bij[^.]*$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[,\-]\s*$/, '').trim();
  return cleaned;
}

function formatSupervisiePart(part: string): string {
  const trimmed = part.trim();
  if (!trimmed) return trimmed;
  if (hasDoctorRolePrefix(trimmed)) return trimmed;
  return `Arts ${trimmed}`;
}

/**
 * Phrase for FML / medisch spreekuur intros.
 * Preserves Verzekeringsarts/Bedrijfsarts/Arts role prefixes from tp_meta.
 */
export function buildArtsPhrase(occupational_doctor_org: string | null | undefined): string {
  const raw = (occupational_doctor_org || '').trim();
  if (!raw) {
    return 'Arts [naam] werkend onder supervisie van Arts [supervisor]';
  }

  const commaMatch = raw.match(/^(.+?)\s*,\s*werkend onder supervisie van\s*:?\s*(.+)$/i);
  if (commaMatch) {
    const primary = formatSupervisiePart(commaMatch[1].trim());
    const supervisor = formatSupervisiePart(commaMatch[2].trim());
    return `${primary} werkend onder supervisie van ${supervisor}`;
  }

  if (/werkend onder supervisie van/i.test(raw)) {
    return cleanDoctorOrgRaw(raw);
  }

  const cleaned = cleanDoctorOrgRaw(raw);
  if (hasDoctorRolePrefix(cleaned)) {
    return cleaned;
  }

  return cleaned ? `Arts ${cleaned}` : 'Arts [naam]';
}

function extractPrimaryDoctorName(value: string): string {
  const primary = value.trim().split(/\s+werkend onder supervisie van/i)[0].trim();
  const prefix = extractDoctorRolePrefix(primary);
  const name = prefix ? primary.slice(prefix.length).trim() : primary;
  return name.toLowerCase();
}

function primaryDoctorsMatch(arts: string, meta: string): boolean {
  if (arts.toLowerCase() === meta.toLowerCase()) return true;
  if (meta.toLowerCase().startsWith(`${arts.toLowerCase()} werkend onder supervisie van`)) {
    return true;
  }
  return extractPrimaryDoctorName(arts) === extractPrimaryDoctorName(meta);
}

/** Enrich spreekuur-extracted name-only arts_org with role from tp_meta occupational_doctor_org. */
export function enrichArtsOrgFromMeta(
  artsOrg: string | null | undefined,
  occupationalDoctorOrg: string | null | undefined
): string | null {
  const arts = (artsOrg || '').trim();
  const meta = (occupationalDoctorOrg || '').trim();

  if (!arts) return meta || null;

  if (meta && /werkend onder supervisie van/i.test(meta) && primaryDoctorsMatch(arts, meta)) {
    return meta;
  }

  if (hasDoctorRolePrefix(arts)) return arts;

  const metaPrefix = meta ? extractDoctorRolePrefix(meta) : null;
  if (metaPrefix && meta) {
    const metaName = meta.slice(metaPrefix.length).trim();
    if (metaName && metaName.toLowerCase() === arts.toLowerCase()) {
      return meta;
    }
    return `${metaPrefix} ${arts}`;
  }

  return arts;
}

export function isMaleGender(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'male' || g === 'man' || g === 'm' || g === 'mannelijk';
}

export function isFemaleGender(gender?: string | null): boolean {
  const g = (gender || '').toLowerCase();
  return g === 'female' || g === 'vrouw' || g === 'f' || g === 'vrouwelijk';
}
