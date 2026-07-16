export type Tp2ExtractionResult = Record<string, unknown>;

const DOCTOR_ROLE_ENUM = ['Arts', 'Anios', 'BA', 'VA', null] as const;
const OSV_ROLE_ENUM = ['Arts', 'Anios', 'BA', null] as const;

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function nullableBoolean(description: string) {
  return { type: ['boolean', 'null'] as const, description };
}

export const TP2_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    intake_date: nullableString('Datum gesprek YYYY-MM-DD'),
    first_sick_day: nullableString('Datum eerste ziektedag YYYY-MM-DD'),
    registration_date: nullableString('Aanmelddatum YYYY-MM-DD'),
    tp_start_date: nullableString('Startdatum traject YYYY-MM-DD'),
    fml_izp_lab_date: nullableString('Datum FML/IZP YYYY-MM-DD'),
    tp_end_date: nullableString('Einddatum traject YYYY-MM-DD'),
    ad_report_date: nullableString('Datum AD-rapport YYYY-MM-DD'),
    occupational_doctor_org: nullableString(
      'Naam bedrijfsarts/BA/VA met eventuele supervisie-zin'
    ),
    occupational_doctor_name: nullableString('Naam arbeidsdeskundige'),
    doctor_role: {
      type: ['string', 'null'] as const,
      enum: DOCTOR_ROLE_ENUM,
      description: 'Role checkbox for primary doctor row',
    },
    osv_doctor_name: nullableString('Naam superviserend arts/BA (OSV rij)'),
    osv_doctor_role: {
      type: ['string', 'null'] as const,
      enum: OSV_ROLE_ENUM,
      description: 'Role checkbox for OSV row',
    },
    ad_report_concept: nullableBoolean(
      'True only when Concept checkbox under AD-rapport is clearly checked; otherwise false (default not concept)'
    ),
  },
  required: [
    'intake_date',
    'first_sick_day',
    'registration_date',
    'tp_start_date',
    'fml_izp_lab_date',
    'tp_end_date',
    'ad_report_date',
    'occupational_doctor_org',
    'occupational_doctor_name',
    'doctor_role',
    'osv_doctor_name',
    'osv_doctor_role',
    'ad_report_concept',
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
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = value;
  }

  if (!('ad_report_concept' in out)) {
    out.ad_report_concept = false;
  }

  return out;
}
