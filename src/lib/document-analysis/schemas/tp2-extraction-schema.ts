import {
  expandDoctorRoleAbbreviations,
  hasDoctorRolePrefix,
  type DoctorRole,
} from '@/lib/tp/format-context';

export type Tp2ExtractionResult = Record<string, unknown>;

export type Tp2DoctorValidationResult = {
  ok: boolean;
  errors: string[];
};

const DOCTOR_ROLE_ENUM = ['Arts', 'Anios', 'Aios', 'BA', 'VA', null] as const;
const OSV_ROLE_ENUM = ['Arts', 'Anios', 'Aios', 'BA', 'VA', null] as const;
/** Intake only has FML/IZP checkboxes — LAB is never extracted from intake. */
const FML_IZP_KIND_ENUM = ['fml', 'izp', null] as const;

const ROLE_TITLE: Record<DoctorRole, string> = {
  Arts: 'Arts',
  Anios: 'Anios',
  Aios: 'Aios',
  BA: 'Bedrijfsarts',
  VA: 'Verzekeringsarts',
};

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function nullableBoolean(description: string) {
  return { type: ['boolean', 'null'] as const, description };
}

function coerceDoctorRole(value: unknown): DoctorRole | null {
  if (value == null || value === '') return null;
  const role = String(value).trim().toUpperCase();
  if (role === 'ARTS') return 'Arts';
  if (role === 'ANIOS') return 'Anios';
  if (role === 'AIOS') return 'Aios';
  if (role === 'BA' || role === 'BEDRIJFSARTS') return 'BA';
  if (role === 'VA' || role === 'VERZEKERINGSARTS') return 'VA';
  return null;
}

function primaryPartOfOrg(org: string): string {
  return (
    expandDoctorRoleAbbreviations(org)
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+werkend onder supervisie van/i)[0]
      ?.trim() || ''
  );
}

/**
 * Soft validation for TP2 doctor fields — triggers one correction retry when
 * supervisie/OSV is present without a primary role title / doctor_role.
 */
export function validateTp2DoctorExtraction(
  result: Tp2ExtractionResult
): Tp2DoctorValidationResult {
  const errors: string[] = [];
  const org =
    typeof result.occupational_doctor_org === 'string'
      ? result.occupational_doctor_org.trim()
      : '';
  const osvName =
    typeof result.osv_doctor_name === 'string' ? result.osv_doctor_name.trim() : '';
  const doctorRole = coerceDoctorRole(result.doctor_role);
  const hasSupervisie =
    Boolean(osvName) || /werkend onder supervisie van/i.test(org);
  const primary = org ? primaryPartOfOrg(org) : '';
  const primaryHasPrefix = primary ? hasDoctorRolePrefix(primary) : false;

  if (hasSupervisie && org && !primaryHasPrefix && !doctorRole) {
    errors.push(
      'OSV/supervisie aanwezig maar doctor_role ontbreekt en primary heeft geen titel. Lees de Naam-rij checkbox (Arts/Anios/Aios/BA/VA) en zet occupational_doctor_org met titelprefix, bijv. "Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien".'
    );
  }

  if (doctorRole && org) {
    const expected = ROLE_TITLE[doctorRole];
    const primaryExpanded = expandDoctorRoleAbbreviations(primary);
    if (!primaryExpanded.toLowerCase().startsWith(`${expected.toLowerCase()} `)) {
      errors.push(
        `doctor_role is "${doctorRole}" maar occupational_doctor_org primary begint niet met "${expected}". Zet de juiste titelprefix op de primary naam.`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export const TP2_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    intake_date: nullableString('Datum gesprek YYYY-MM-DD'),
    first_sick_day: nullableString('Datum eerste ziektedag YYYY-MM-DD'),
    registration_date: nullableString('Aanmelddatum YYYY-MM-DD'),
    tp_start_date: nullableString('Startdatum traject YYYY-MM-DD'),
    fml_izp_lab_date: nullableString('Datum FML/IZP YYYY-MM-DD'),
    fml_izp_lab_kind: {
      type: ['string', 'null'] as const,
      enum: FML_IZP_KIND_ENUM,
      description:
        'Which checkbox is checked next to Datum FML/IZP in sectie 6: fml or izp; null if both/neither/unclear',
    },
    tp_end_date: nullableString('Einddatum traject YYYY-MM-DD'),
    ad_report_date: nullableString('Datum AD-rapport YYYY-MM-DD'),
    occupational_doctor_org: nullableString(
      'Titled primary doctor, optionally with supervisie clause. Examples: "Arts P. Mort werkend onder supervisie van Bedrijfsarts K. Julien"; "Verzekeringsarts A.J. Karim". Never bare name when doctor_role is known. Never use BA/VA abbreviations as titles.'
    ),
    occupational_doctor_name: nullableString(
      'Naam arbeidsdeskundige (Naam AD) — not the bedrijfsarts/arts'
    ),
    doctor_role: {
      type: ['string', 'null'] as const,
      enum: DOCTOR_ROLE_ENUM,
      description:
        'Checked checkbox on Naam row only: Arts | Anios | Aios | BA | VA. Arts is not Bedrijfsarts. Null if none/unclear.',
    },
    osv_doctor_name: nullableString('Naam superviserend arts/BA (OSV rij)'),
    osv_doctor_role: {
      type: ['string', 'null'] as const,
      enum: OSV_ROLE_ENUM,
      description:
        'Checked checkbox on OSV row only: Arts | Anios | Aios | BA | VA. Null if none/unclear.',
    },
    ad_report_concept: nullableBoolean(
      'True only when Concept checkbox under AD-rapport is clearly checked; otherwise false (default not concept)'
    ),
    is_ex_werknemer: nullableBoolean(
      'True only when Ex-werknemer checkbox in sectie 6 header is clearly checked; otherwise false'
    ),
  },
  required: [
    'intake_date',
    'first_sick_day',
    'registration_date',
    'tp_start_date',
    'fml_izp_lab_date',
    'fml_izp_lab_kind',
    'tp_end_date',
    'ad_report_date',
    'occupational_doctor_org',
    'occupational_doctor_name',
    'doctor_role',
    'osv_doctor_name',
    'osv_doctor_role',
    'ad_report_concept',
    'is_ex_werknemer',
  ],
  additionalProperties: false,
} as const;

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

export function parseTp2ExtractionResult(raw: unknown): Tp2ExtractionResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Tp2ExtractionResult = {};

  for (const [key, value] of Object.entries(o)) {
    if (!isPresent(value)) continue;
    out[key] = value;
  }

  if (!('ad_report_concept' in out)) {
    out.ad_report_concept = false;
  }

  if (!('is_ex_werknemer' in out)) {
    out.is_ex_werknemer = false;
  }

  return out;
}
