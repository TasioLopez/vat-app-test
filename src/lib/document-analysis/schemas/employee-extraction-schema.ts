export type EmployeeExtractionResult = Record<string, unknown>;

const GENDER_ENUM = ['Man', 'Vrouw', null] as const;
const DUTCH_LEVEL_ENUM = ['Goed', 'Gemiddeld', 'Niet goed', null] as const;
const TRANSPORT_OPTIONS = ['Auto', 'Fiets', 'Bromfiets', 'Motor', 'OV', 'Lopend'] as const;
const COMPUTER_SKILLS_ENUM = ['1', '2', '3', '4', '5', null] as const;

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function nullableNumber(description: string) {
  return { type: ['number', 'null'] as const, description };
}

function nullableBoolean(description: string) {
  return { type: ['boolean', 'null'] as const, description };
}

export const EMPLOYEE_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    current_job: nullableString('Functietitel werknemer'),
    contract_hours: nullableNumber('Contracturen per week als getal'),
    date_of_birth: nullableString('Geboortedatum YYYY-MM-DD'),
    gender: {
      type: ['string', 'null'] as const,
      enum: GENDER_ENUM,
      description: 'Geslacht: Man of Vrouw',
    },
    phone: nullableString('Telefoonnummer werknemer'),
    work_experience: nullableString('Werkervaring als komma-gescheiden functietitels'),
    education_level: nullableString('Hoogste afgeronde opleiding'),
    education_name: nullableString('Naam of richting van de opleiding'),
    other_employers: nullableString('Andere werkgevers, komma-gescheiden'),
    transport_type: {
      type: 'array',
      description: 'Aangevinkte vervoersopties; lege array indien geen',
      items: {
        type: 'string',
        enum: TRANSPORT_OPTIONS,
      },
    },
    drivers_license: nullableBoolean('Heeft rijbewijs'),
    drivers_license_type: {
      type: 'array',
      description: 'Rijbewijscategorieën; lege array indien geen',
      items: { type: 'string' },
    },
    dutch_speaking: {
      type: ['string', 'null'] as const,
      enum: DUTCH_LEVEL_ENUM,
      description: 'Nederlands spreken: Goed, Gemiddeld of Niet goed',
    },
    dutch_writing: {
      type: ['string', 'null'] as const,
      enum: DUTCH_LEVEL_ENUM,
      description: 'Nederlands schrijven',
    },
    dutch_reading: {
      type: ['string', 'null'] as const,
      enum: DUTCH_LEVEL_ENUM,
      description: 'Nederlands lezen',
    },
    has_computer: nullableBoolean('Heeft PC of laptop'),
    computer_skills: {
      type: ['string', 'null'] as const,
      enum: COMPUTER_SKILLS_ENUM,
      description: 'Computervaardigheid 1-5',
    },
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
    'work_experience',
    'education_level',
    'education_name',
    'other_employers',
    'transport_type',
    'drivers_license',
    'drivers_license_type',
    'dutch_speaking',
    'dutch_writing',
    'dutch_reading',
    'has_computer',
    'computer_skills',
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

/** Coerce strict schema output to a flat record, omitting null/empty values. */
export function parseEmployeeExtractionResult(raw: unknown): EmployeeExtractionResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: EmployeeExtractionResult = {};

  for (const [key, value] of Object.entries(o)) {
    if (!isPresent(value)) continue;
    out[key] = value;
  }

  return out;
}
