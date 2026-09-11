import { parseDateFlexible, toISODate } from '@/lib/tp2026/trajectory-dates';
import { normalizeFmlIzpLabKind } from '@/lib/document-analysis/schemas/tp2-date-schema';
import { normalizeAdReportConcept } from '@/lib/tp/ad-report-wording';
import { normalizeExWerknemer } from '@/lib/tp/ex-werknemer-wording';
import {
  buildSupervisiePhrase,
  DOCTOR_ROLE_PREFIXES,
  expandDoctorRoleAbbreviations,
  extractDoctorRolePrefix,
  hasDoctorRolePrefix,
  stripLeadingDoctorRolePrefix,
  type DoctorRole,
} from '@/lib/tp/format-context';
import { formatPersonShortName } from '@/lib/utils';

export type { DoctorRole };

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
  Aios: 'Aios',
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
  if (role === 'AIOS') return 'Aios';
  if (role === 'BA' || role === 'BEDRIJFSARTS') return 'BA';
  if (role === 'VA' || role === 'VERZEKERINGSARTS') return 'VA';
  return undefined;
}

export function formatOccupationalDoctorOrg(
  raw: string | null | undefined,
  role?: DoctorRole | null
): string | undefined {
  if (!raw?.trim()) return undefined;

  let cleaned = expandDoctorRoleAbbreviations(raw.trim()).replace(/\s+/g, ' ').trim();
  if (/werkend onder supervisie van/i.test(cleaned)) {
    // Expand BA/VA, and ensure primary has a title when doctor_role is known.
    const parts = cleaned.split(/\s+werkend onder supervisie van\s+/i);
    const primaryPart = (parts[0] || '').trim();
    const supervisorPart = (parts[1] || '').trim();
    if (!primaryPart) return cleaned;

    let primary = primaryPart;
    if (role && ROLE_PREFIX[role] && !hasDoctorRolePrefix(primary)) {
      primary = `${ROLE_PREFIX[role]} ${stripLeadingDoctorRolePrefix(primary)}`.trim();
    } else {
      primary = expandDoctorRoleAbbreviations(primary);
    }

    if (!supervisorPart) return primary;
    return `${primary} werkend onder supervisie van ${supervisorPart}`;
  }

  cleaned = cleaned.replace(/\s*-?\s*BIG\s*(nr\.?|nummer)?\s*[\d\s]+/gi, '');
  cleaned = cleaned.replace(/\s*-?\s*Bedrijfsarts\s*$/i, '');
  cleaned = cleaned.replace(/,?\s*intern gebruik bij[^.]*$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[,\-]\s*$/, '').trim();
  if (!cleaned) return undefined;

  const alreadyPrefixed = DOCTOR_ROLE_PREFIXES.some((prefix) =>
    cleaned.toLowerCase().startsWith(`${prefix.toLowerCase()} `)
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
  if (!str) return undefined;

  const rolePrefix = extractDoctorRolePrefix(str);
  const namePart = rolePrefix
    ? str.slice(rolePrefix.length).trim()
    : str;
  const shortName = formatPersonShortName(namePart);
  if (!shortName) return undefined;
  return rolePrefix ? `${rolePrefix} ${shortName}`.trim() : shortName;
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

  if ('fml_izp_lab_kind' in out) {
    const kind = normalizeFmlIzpLabKind(out.fml_izp_lab_kind);
    if (kind) out.fml_izp_lab_kind = kind;
    else delete out.fml_izp_lab_kind;
  }

  if (out.occupational_doctor_org != null) {
    const primaryRaw = String(out.occupational_doctor_org);
    const osvNameRaw =
      out.osv_doctor_name != null ? String(out.osv_doctor_name).trim() : '';
    const osvRole = normalizeDoctorRole(out.osv_doctor_role);
    const hasRoleSignal = Boolean(doctorRole || osvRole || osvNameRaw);

    let formatted: string | undefined;
    if (hasRoleSignal) {
      // Always rebuild from roles + names; do not trust a weak model phrase.
      const expanded = expandDoctorRoleAbbreviations(primaryRaw)
        .replace(/\s+/g, ' ')
        .trim();
      const parts = expanded.split(/\s+werkend onder supervisie van\s+/i);
      const primaryBare = stripLeadingDoctorRolePrefix((parts[0] || '').trim());
      const supervisorFromOrg = (parts[1] || '').trim();
      const supervisorForPhrase = osvNameRaw
        ? stripLeadingDoctorRolePrefix(
            expandDoctorRoleAbbreviations(osvNameRaw).replace(/\s+/g, ' ').trim()
          )
        : supervisorFromOrg;

      if (supervisorForPhrase) {
        formatted = buildSupervisiePhrase(
          primaryBare,
          doctorRole,
          supervisorForPhrase,
          osvRole
        );
      } else {
        formatted = formatOccupationalDoctorOrg(primaryBare, doctorRole);
      }
    } else {
      formatted = formatOccupationalDoctorOrg(primaryRaw, doctorRole);
    }

    if (formatted) out.occupational_doctor_org = formatted;
    else delete out.occupational_doctor_org;
  }

  if (out.occupational_doctor_name != null) {
    const formatted = normalizeOccupationalDoctorName(out.occupational_doctor_name);
    if (formatted) out.occupational_doctor_name = formatted;
    else delete out.occupational_doctor_name;
  }

  out.ad_report_concept = normalizeAdReportConcept(
    out.ad_report_concept ?? out.intake_concept
  );
  out.is_ex_werknemer = normalizeExWerknemer(out.is_ex_werknemer);
  delete out.intake_concept;

  delete out.doctor_role;
  delete out.osv_doctor_name;
  delete out.osv_doctor_role;
  return out;
}
