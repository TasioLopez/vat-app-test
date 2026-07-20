import { EDUCATION_LEVEL_OPTIONS, TRANSPORT_TYPE_OPTIONS } from '@/lib/tp2026/gegevens-field-options';

export type IntakeAlgemeneInfoExtractionResult = Record<string, unknown>;

const DUTCH_LEVEL_ENUM = ['Goed', 'Gemiddeld', 'Niet goed', null] as const;
const COMPUTER_SKILLS_ENUM = ['1', '2', '3', '4', '5', null] as const;
const EDUCATION_LEVEL_ENUM = [...EDUCATION_LEVEL_OPTIONS, null] as const;

const TRANSPORT_CHECKBOX_KEYS = [
  'transport_auto',
  'transport_fiets',
  'transport_ov',
  'transport_lopend',
] as const;

const TRANSPORT_CHECKBOX_TO_LABEL: Record<(typeof TRANSPORT_CHECKBOX_KEYS)[number], string> = {
  transport_auto: 'Auto',
  transport_fiets: 'Fiets',
  transport_ov: 'OV',
  transport_lopend: 'Lopend',
};

function nullableString(description: string) {
  return { type: ['string', 'null'] as const, description };
}

function nullableBoolean(description: string) {
  return { type: ['boolean', 'null'] as const, description };
}

function transportCheckbox(label: string) {
  return {
    type: 'boolean' as const,
    description: `True ONLY if the checkbox next to "${label}" on the "Hoe verplaatst werknemer zich" row is filled (☒/☑/X). Not rijbewijs categories (B/C/AM). Empty ☐ = false.`,
  };
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
    // Per-box booleans force the model to evaluate each checkbox independently
    // (free-form transport_type arrays frequently invent all options).
    transport_auto: transportCheckbox('Auto'),
    transport_fiets: transportCheckbox('Fiets'),
    transport_ov: transportCheckbox('OV'),
    transport_lopend: transportCheckbox('Lopend'),
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
    'transport_auto',
    'transport_fiets',
    'transport_ov',
    'transport_lopend',
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

/** Map per-checkbox booleans → transport_type array in canonical order. */
export function transportTypeFromCheckboxes(
  raw: Record<string, unknown>
): string[] {
  const allowed = new Set<string>(TRANSPORT_TYPE_OPTIONS);
  const out: string[] = [];
  for (const key of TRANSPORT_CHECKBOX_KEYS) {
    if (raw[key] === true) {
      const label = TRANSPORT_CHECKBOX_TO_LABEL[key];
      if (allowed.has(label)) out.push(label);
    }
  }
  return out;
}

export function parseIntakeAlgemeneInfoExtractionResult(
  raw: unknown
): IntakeAlgemeneInfoExtractionResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: IntakeAlgemeneInfoExtractionResult = {};

  // Prefer structured per-box booleans when present.
  const hasCheckboxFields = TRANSPORT_CHECKBOX_KEYS.some((k) => k in o);
  if (hasCheckboxFields) {
    out.transport_type = transportTypeFromCheckboxes(o);
  }

  for (const [key, value] of Object.entries(o)) {
    if ((TRANSPORT_CHECKBOX_KEYS as readonly string[]).includes(key)) continue;
    if (key === 'transport_type') {
      if (!hasCheckboxFields && Array.isArray(value)) out[key] = value;
      continue;
    }
    if (key === 'drivers_license_type') {
      if (Array.isArray(value)) out[key] = value;
      continue;
    }
    if (!isPresent(value)) continue;
    out[key] = value;
  }
  return out;
}

export { EDUCATION_LEVEL_ENUM, TRANSPORT_CHECKBOX_KEYS };
