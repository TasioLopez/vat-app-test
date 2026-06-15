import { parseDateFlexible, toISODate } from '@/lib/tp2026/trajectory-dates';

export type DoctorRole = 'Arts' | 'Anios' | 'BA' | 'VA';

const TP2_DATE_KEYS = [
  'first_sick_day',
  'registration_date',
  'intake_date',
  'ad_report_date',
  'fml_izp_lab_date',
  'tp_start_date',
  'tp_end_date',
] as const;

const ROLE_PREFIX: Record<DoctorRole, string> = {
  Arts: 'Arts',
  Anios: 'Anios',
  BA: 'Bedrijfsarts',
  VA: 'Verzekeringsarts',
};

function normalizeDateValue(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  const str = String(value).trim();
  if (!str) return undefined;
  const parsed = parseDateFlexible(str);
  if (!parsed) return undefined;
  return toISODate(parsed);
}

function normalizeDoctorRole(value: unknown): DoctorRole | undefined {
  const role = String(value ?? '').trim().toUpperCase();
  if (role === 'ARTS') return 'Arts';
  if (role === 'ANIOS') return 'Anios';
  if (role === 'BA' || role === 'BEDRIJFSARTS') return 'BA';
  if (role === 'VA' || role === 'VERZEKERINGSARTS') return 'VA';
  return undefined;
}

export function formatOccupationalDoctorOrg(
  raw: string | null | undefined,
  role?: DoctorRole | null
): string | undefined {
  if (!raw?.trim()) return undefined;

  let cleaned = raw.trim();
  if (/werkend onder supervisie van/i.test(cleaned)) {
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  cleaned = cleaned.replace(/\s*-?\s*BIG\s*(nr\.?|nummer)?\s*[\d\s]+/gi, '');
  cleaned = cleaned.replace(/\s*-?\s*Bedrijfsarts\s*$/i, '');
  cleaned = cleaned.replace(/,?\s*intern gebruik bij[^.]*$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[,\-]\s*$/, '').trim();
  if (!cleaned) return undefined;

  const rolePrefixes = ['Verzekeringsarts', 'Bedrijfsarts', 'Arts', 'Anios'];
  const alreadyPrefixed = rolePrefixes.some((prefix) =>
    cleaned.toLowerCase().startsWith(prefix.toLowerCase())
  );
  if (alreadyPrefixed) return cleaned;

  if (role && ROLE_PREFIX[role]) {
    return `${ROLE_PREFIX[role]} ${cleaned}`;
  }

  return cleaned;
}

export function normalizeOccupationalDoctorName(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  const str = String(raw).trim().replace(/\s+/g, ' ');
  return str || undefined;
}

/** Normalize raw TP2 extraction from intake / fallback documents. */
export function normalizeTp2ExtractedData(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  const doctorRole = normalizeDoctorRole(out.doctor_role);

  for (const key of TP2_DATE_KEYS) {
    if (!(key in out)) continue;
    const iso = normalizeDateValue(out[key]);
    if (iso) out[key] = iso;
    else delete out[key];
  }

  if (
    out.registration_date &&
    out.fml_izp_lab_date &&
    out.registration_date === out.fml_izp_lab_date
  ) {
    delete out.registration_date;
  }

  if (out.occupational_doctor_org != null) {
    const formatted = formatOccupationalDoctorOrg(
      String(out.occupational_doctor_org),
      doctorRole
    );
    if (formatted) out.occupational_doctor_org = formatted;
    else delete out.occupational_doctor_org;
  }

  if (out.occupational_doctor_name != null) {
    const formatted = normalizeOccupationalDoctorName(out.occupational_doctor_name);
    if (formatted) out.occupational_doctor_name = formatted;
    else delete out.occupational_doctor_name;
  }

  delete out.doctor_role;
  return out;
}
