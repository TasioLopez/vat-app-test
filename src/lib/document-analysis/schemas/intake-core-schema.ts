import { EDUCATION_LEVEL_OPTIONS } from '@/lib/tp2026/gegevens-field-options';

export type IntakeCoreExtractionResult = Record<string, unknown>;

const GENDER_ENUM = ['Man', 'Vrouw', null] as const;

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function nullableNumber(description: string) {
  return { type: ['number', 'null'] as const, description };
}

export const INTAKE_CORE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    current_job: nullableString('Functietitel werknemer (sectie 2)'),
    contract_hours: nullableNumber('Contracturen per week als getal (sectie 2)'),
    date_of_birth: nullableString('Geboortedatum YYYY-MM-DD (sectie 6 of sectie 2)'),
    gender: {
      type: ['string', 'null'] as const,
      enum: GENDER_ENUM,
      description: 'Geslacht: Man of Vrouw (sectie 2)',
    },
    phone: nullableString('Telefoonnummer werknemer (sectie 2, niet contactpersoon)'),
    other_employers: nullableString('Andere werkgevers komma-gescheiden (sectie 2)'),
    referent_first_name: nullableString('Voornaam contactpersoon werkgever (sectie 4)'),
    referent_last_name: nullableString('Achternaam contactpersoon werkgever (sectie 4)'),
    referent_function: nullableString('Functietitel contactpersoon (sectie 4)'),
    referent_phone: nullableString('Telefoon contactpersoon (sectie 4)'),
    referent_email: nullableString('E-mail contactpersoon (sectie 4)'),
    referent_gender: nullableString('Geslacht contactpersoon indien expliciet vermeld'),
  },
  required: [
    'current_job',
    'contract_hours',
    'date_of_birth',
    'gender',
    'phone',
    'other_employers',
    'referent_first_name',
    'referent_last_name',
    'referent_function',
    'referent_phone',
    'referent_email',
    'referent_gender',
  ],
  additionalProperties: false,
} as const;

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function parseIntakeCoreExtractionResult(raw: unknown): IntakeCoreExtractionResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: IntakeCoreExtractionResult = {};
  for (const [key, value] of Object.entries(o)) {
    if (!isPresent(value)) continue;
    out[key] = value;
  }
  return out;
}

/** For tests — education enum lives on sectie 17 schema only. */
export const INTAKE_CORE_EDUCATION_LEVEL_OPTIONS = EDUCATION_LEVEL_OPTIONS;
