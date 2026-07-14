import { EDUCATION_LEVEL_OPTIONS } from '@/lib/tp2026/gegevens-field-options';

export type IntakeAlgemeneInfoExtractionResult = Record<string, unknown>;

const DUTCH_LEVEL_ENUM = ['Goed', 'Gemiddeld', 'Niet goed', null] as const;
const TRANSPORT_OPTIONS = ['Auto', 'Fiets', 'Bromfiets', 'Motor', 'OV', 'Lopend'] as const;
const COMPUTER_SKILLS_ENUM = ['1', '2', '3', '4', '5', null] as const;
const EDUCATION_LEVEL_ENUM = [...EDUCATION_LEVEL_OPTIONS, null] as const;

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function nullableBoolean(description: string) {
  return { type: ['boolean', 'null'] as const, description };
}

export const INTAKE_ALGEMENE_INFO_JSON_SCHEMA = {
  type: 'object',
  properties: {
    education_level: {
      type: ['string', 'null'] as const,
      enum: EDUCATION_LEVEL_ENUM,
      description: 'Hoogste afgeronde opleiding uit sectie 17 Opleidingen-tabel',
    },
    education_name: nullableString('Richting/naam bij education_level; geen certificaten'),
    work_experience: nullableString('Komma-gescheiden functietitels; geen huidige functie'),
    transport_type: {
      type: 'array',
      description: 'Aangevinkte vervoersopties sectie 17',
      items: { type: 'string', enum: TRANSPORT_OPTIONS },
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
      description: 'Nederlands spreken G/R/O',
    },
    dutch_writing: {
      type: ['string', 'null'] as const,
      enum: DUTCH_LEVEL_ENUM,
      description: 'Nederlands schrijven G/R/O',
    },
    dutch_reading: {
      type: ['string', 'null'] as const,
      enum: DUTCH_LEVEL_ENUM,
      description: 'Nederlands lezen G/R/O',
    },
    has_computer: nullableBoolean('PC/laptop aangevinkt'),
    computer_skills: {
      type: ['string', 'null'] as const,
      enum: COMPUTER_SKILLS_ENUM,
      description: 'Computervaardigheid 1-5',
    },
  },
  required: [
    'education_level',
    'education_name',
    'work_experience',
    'transport_type',
    'drivers_license',
    'drivers_license_type',
    'dutch_speaking',
    'dutch_writing',
    'dutch_reading',
    'has_computer',
    'computer_skills',
  ],
  additionalProperties: false,
} as const;

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function parseIntakeAlgemeneInfoExtractionResult(
  raw: unknown
): IntakeAlgemeneInfoExtractionResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: IntakeAlgemeneInfoExtractionResult = {};
  for (const [key, value] of Object.entries(o)) {
    if (key === 'transport_type' || key === 'drivers_license_type') {
      if (Array.isArray(value)) out[key] = value;
      continue;
    }
    if (!isPresent(value)) continue;
    out[key] = value;
  }
  return out;
}

export { EDUCATION_LEVEL_ENUM };
