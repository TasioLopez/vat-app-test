/** Shared date and doctor formatting for TP section builders. */

export const DOCTOR_ROLE_PREFIXES = [
  'Arts Bedrijfsgeneeskunde',
  'Verzekeringsarts',
  'Bedrijfsarts',
  'Arts',
  'Anios',
  'Aios',
] as const;

export type DoctorRole = 'Arts' | 'Anios' | 'Aios' | 'BA' | 'VA';

const DOCTOR_ROLE_PREFIX: Record<DoctorRole, string> = {
  Arts: 'Arts',
  Anios: 'Anios',
  Aios: 'Aios',
  BA: 'Bedrijfsarts',
  VA: 'Verzekeringsarts',
};

/** Expand intake checkbox abbreviations BA/VA to full Dutch titles in written text. */
export function expandDoctorRoleAbbreviations(text: string): string {
  return text
    .replace(/\bVA\b/gi, 'Verzekeringsarts')
    .replace(/\bBA\b/gi, 'Bedrijfsarts');
}

/** Format a doctor name with role prefix when not already prefixed. */
export function formatDoctorWithRole(name: string, role?: DoctorRole | null): string {
  const trimmed = expandDoctorRoleAbbreviations(name.trim()).replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (/werkend onder supervisie van/i.test(trimmed)) {
    return trimmed;
  }
  if (hasDoctorRolePrefix(trimmed)) return trimmed;
  if (role && DOCTOR_ROLE_PREFIX[role]) return `${DOCTOR_ROLE_PREFIX[role]} ${trimmed}`;
  return trimmed;
}

/**
 * Combine primary doctor + OSV supervisor into a supervisie phrase.
 * Preserves verbatim text when supervisie is already present (after BA/VA expansion).
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
    return expandDoctorRoleAbbreviations(raw.replace(/\s+/g, ' ').trim());
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
  // Longest prefixes first (Arts Bedrijfsgeneeskunde before Arts).
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

/** Default Stap 2 / Gegevens label when no role prefix is present on the value. */
export const DEFAULT_OCCUPATIONAL_DOCTOR_LABEL = 'Bedrijfsarts';

/**
 * Gegevens label for occupational_doctor_org: use the leading doctor title
 * (Verzekeringsarts, Aios, Anios, Arts, Bedrijfsarts) when present.
 */
export function resolveOccupationalDoctorLabel(
  occupationalDoctorOrg: string | null | undefined
): string {
  if (!occupationalDoctorOrg?.trim()) return DEFAULT_OCCUPATIONAL_DOCTOR_LABEL;
  const expanded = expandDoctorRoleAbbreviations(occupationalDoctorOrg.trim());
  return extractDoctorRolePrefix(expanded) ?? DEFAULT_OCCUPATIONAL_DOCTOR_LABEL;
}

/** Strip a leading doctor-role title so print can show title in the label and name in the value. */
export function stripLeadingDoctorRolePrefix(value: string): string {
  const expanded = expandDoctorRoleAbbreviations(value.trim()).replace(/\s+/g, ' ').trim();
  if (!expanded) return '';
  const prefix = extractDoctorRolePrefix(expanded);
  if (!prefix) return expanded;
  return expanded.slice(prefix.length).trim();
}

/** Longest title first so Bedrijfsarts/Verzekeringsarts/Arts Bedrijfsgeneeskunde are not read as Arts. */
const SIGNATURE_ROLE_PATTERN =
  'Arts\\s+Bedrijfsgeneeskunde|AIOS\\s+bedrijfsgeneeskunde|Verzekeringsarts|Bedrijfsarts|Anios|Aios|Arts';

function canonicalDoctorRole(role: string): string {
  const normalized = role.replace(/\s+/g, ' ').trim();
  if (/^aios\s+bedrijfsgeneeskunde$/i.test(normalized)) return 'Arts Bedrijfsgeneeskunde';
  if (/^arts\s+bedrijfsgeneeskunde$/i.test(normalized)) return 'Arts Bedrijfsgeneeskunde';
  const found = DOCTOR_ROLE_PREFIXES.find(
    (prefix) => prefix.toLowerCase() === normalized.toLowerCase()
  );
  return found ?? normalized;
}

function stripDoctorCourtesyTitles(value: string): string {
  return value.replace(/\b(?:de heer|mevrouw)\s+/gi, '').replace(/\s+/g, ' ').trim();
}

function hasExtendedDoctorRolePrefix(value: string): boolean {
  const trimmed = value.trim();
  if (/^arts\s+bedrijfsgeneeskunde\s+/i.test(trimmed)) return true;
  return hasDoctorRolePrefix(trimmed);
}

/**
 * Prefer the more specific "Arts Bedrijfsgeneeskunde" title over a leading Aios/Anios/Arts.
 * "Aios S. de Beaufort, Arts Bedrijfsgeneeskunde" → "Arts Bedrijfsgeneeskunde S. de Beaufort"
 */
function promoteArtsBedrijfsgeneeskunde(primary: string): string {
  const match = primary.match(
    new RegExp(
      `^(.+?)(?:,\\s*|\\s+)(${SIGNATURE_ROLE_PATTERN})\\.?$`,
      'i'
    )
  );
  if (!match) return primary;
  const trailingRole = canonicalDoctorRole(match[2]);
  if (trailingRole !== 'Arts Bedrijfsgeneeskunde') {
    // Generic trailing title move (E. van Wijk, Arts).
    let name = match[1].replace(/[\s,-]+$/g, '').trim();
    if (!name) return primary;
    if (hasExtendedDoctorRolePrefix(name)) return name;
    return `${trailingRole} ${name}`;
  }

  let name = match[1].replace(/[\s,-]+$/g, '').trim();
  // Drop redundant short trainee titles when the long title is present.
  name = name.replace(/^(Aios|Anios|Arts)\s+/i, '').trim();
  if (!name) return primary;
  return `Arts Bedrijfsgeneeskunde ${name}`;
}

function formatSupervisorPhrase(supervisor: string): string {
  let cleaned = supervisor.replace(/\s+/g, ' ').trim();
  // "E. Visser, bedrijfsarts" → title first
  const trailing = cleaned.match(
    new RegExp(`^(.+?),\\s*(${SIGNATURE_ROLE_PATTERN})\\.?$`, 'i')
  );
  if (trailing) {
    const name = trailing[1].replace(/[\s,-]+$/g, '').trim();
    const role = canonicalDoctorRole(trailing[2]);
    if (name) cleaned = `${role} ${name}`;
  }
  if (hasExtendedDoctorRolePrefix(cleaned) || hasDoctorRolePrefix(cleaned)) {
    return cleaned;
  }
  // Bare supervisor names default to Bedrijfsarts (OSV).
  return `Bedrijfsarts ${cleaned}`;
}

/**
 * Dutch report signatures put the title after the name:
 * "E. van Wijk, Arts. Werkend onder supervisie van …".
 * Move that title to the front, or drop it when a leading title is already present.
 * Also normalizes "Arts Bedrijfsgeneeskunde" and bare supervisors.
 */
function normalizeDoctorSignature(value: string): string {
  // Unify sentence breaks / standalone "Onder supervisie" footers into one clause.
  // Do not rewrite the "onder" inside an existing "werkend onder supervisie" phrase.
  let normalized = value
    .replace(/\.\s*Werkend onder supervisie van\s+/gi, ' werkend onder supervisie van ')
    .replace(/(?<!werkend\s)\bOnder supervisie van\s+/gi, 'werkend onder supervisie van ')
    .replace(/\s+/g, ' ')
    .trim();

  const supervisie = normalized.match(
    new RegExp(
      `^(.+?)\\s+werkend onder supervisie van\\s+(.+)$`,
      'i'
    )
  );
  if (supervisie) {
    const primary = promoteArtsBedrijfsgeneeskunde(supervisie[1].replace(/[\s,-]+$/g, '').trim());
    const supervisor = formatSupervisorPhrase(supervisie[2].trim());
    if (!primary || !supervisor) return normalized;
    return `${primary} werkend onder supervisie van ${supervisor}`;
  }

  return promoteArtsBedrijfsgeneeskunde(normalized);
}

export function cleanDoctorOrgRaw(raw: string): string {
  let cleaned = expandDoctorRoleAbbreviations(raw.trim());

  // Strip BIG / registration IDs (parenthesized or bare), then leftover empty ().
  cleaned = cleaned.replace(/\(\s*BIG\s*(nr\.?|nummer)?\s*[\d.\s]*\s*\)/gi, '');
  cleaned = cleaned.replace(/\bBIG\s*(nr\.?|nummer)?\s*[\d.\s]+/gi, '');
  cleaned = cleaned.replace(/\(\s*\)/g, '');

  cleaned = stripDoctorCourtesyTitles(cleaned);
  cleaned = normalizeDoctorSignature(cleaned);

  // Strip trailing punctuation first so "bedrijfsarts." still matches the role strip below.
  cleaned = cleaned.replace(/[.,;:\-]+\s*$/, '').trim();
  // Only strip a dangling duplicate "Bedrijfsarts" footer when the value already has a
  // leading role (e.g. "Bedrijfsarts E. Visser - Bedrijfsarts"). Never strip when the
  // only title is trailing, and never strip inside a supervisie clause.
  if (!/supervisie/i.test(cleaned) && hasDoctorRolePrefix(cleaned)) {
    cleaned = cleaned.replace(/\s*-?\s*Bedrijfsarts\.?\s*$/i, '');
  }
  cleaned = cleaned.replace(/,?\s*intern gebruik bij[^.]*$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[.,;:\-]+\s*$/, '').trim();
  return cleaned;
}

/** Soft omission when arts name is unknown — keeps intro templates grammatical. */
export const UNKNOWN_ARTS_PHRASE = 'de bedrijfsarts';

function stripTrailingPhrasePunctuation(value: string): string {
  return value.replace(/[.,;:\-]+\s*$/, '').trim();
}

function formatSupervisiePart(part: string, { supervisor = false } = {}): string {
  const trimmed = expandDoctorRoleAbbreviations(part.trim()).replace(/\s+/g, ' ').trim();
  if (!trimmed) return trimmed;
  if (hasExtendedDoctorRolePrefix(trimmed) || hasDoctorRolePrefix(trimmed)) return trimmed;
  return supervisor ? `Bedrijfsarts ${trimmed}` : `Arts ${trimmed}`;
}

/**
 * Phrase for FML / medisch spreekuur intros.
 * Preserves Verzekeringsarts/Bedrijfsarts/Arts role prefixes from tp_meta.
 * Returns empty string when unknown — callers omit "opgesteld door …" rather than
 * printing the soft placeholder "de bedrijfsarts".
 */
export function buildArtsPhrase(occupational_doctor_org: string | null | undefined): string {
  const raw = cleanDoctorOrgRaw(occupational_doctor_org || '');
  if (!raw) {
    return '';
  }

  let phrase: string;
  const commaMatch = raw.match(/^(.+?)\s*,\s*werkend onder supervisie van\s*:?\s*(.+)$/i);
  if (commaMatch) {
    const primary = formatSupervisiePart(commaMatch[1].trim());
    const supervisor = formatSupervisiePart(commaMatch[2].trim(), { supervisor: true });
    phrase = cleanDoctorOrgRaw(`${primary} werkend onder supervisie van ${supervisor}`);
  } else if (/werkend onder supervisie van/i.test(raw)) {
    // cleanDoctorOrgRaw already normalized titles / bare supervisors.
    phrase = raw;
  } else if (hasExtendedDoctorRolePrefix(raw) || hasDoctorRolePrefix(raw)) {
    phrase = raw;
  } else {
    phrase = `Arts ${raw}`;
  }

  return stripTrailingPhrasePunctuation(phrase);
}

/** True when artsPhrase should be omitted from intro templates. */
export function isUnknownArtsPhrase(artsPhrase: string | null | undefined): boolean {
  const raw = String(artsPhrase ?? '').trim();
  if (!raw) return true;
  return raw.toLowerCase() === UNKNOWN_ARTS_PHRASE.toLowerCase();
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
  const arts = cleanDoctorOrgRaw(artsOrg || '');
  const meta = cleanDoctorOrgRaw(occupationalDoctorOrg || '');

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
    return cleanDoctorOrgRaw(`${metaPrefix} ${arts}`);
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
