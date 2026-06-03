import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026GegevensFields } from '@/lib/tp2026/schema';

export type GegevensFieldLayout = 'stack' | 'row';
export type GegevensFieldSpan = 'full' | 'half' | 'third';

export type GegevensEditorRow = {
  keys: string[];
  spans?: GegevensFieldSpan[];
  layout?: GegevensFieldLayout | GegevensFieldLayout[];
};

export type GegevensEditorSection = {
  id: string;
  title: string;
  rows: GegevensEditorRow[];
};

const GEGEVENS_FIELD_MAP = new Map<string, TP2026FieldDef>(
  TP2026GegevensFields.map((f) => [f.key, f])
);

export function getGegevensFieldDef(key: string): TP2026FieldDef {
  const def = GEGEVENS_FIELD_MAP.get(key);
  if (!def) {
    throw new Error(`Unknown Gegevens field key: ${key}`);
  }
  return def;
}

export const GEGEVENS_EDITOR_SECTIONS: GegevensEditorSection[] = [
  {
    id: 'werknemer',
    title: 'Gegevens werknemer',
    rows: [
      { keys: ['gender', 'date_of_birth'], layout: 'row' },
      { keys: ['phone', 'email'] },
    ],
  },
  {
    id: 'traject',
    title: 'Gegevens re-integratietraject 2e spoor',
    rows: [
      { keys: ['first_sick_day', 'registration_date'], layout: 'row' },
      { keys: ['intake_date', 'tp_creation_date'], layout: 'row' },
      { keys: ['has_ad_report'], layout: 'stack' },
      { keys: ['ad_report_date', 'fml_izp_lab_date'], layout: 'row' },
      { keys: ['occupational_doctor_name', 'occupational_doctor_org'] },
    ],
  },
  {
    id: 'opdrachtgever',
    title: 'Gegevens opdrachtgever',
    rows: [
      { keys: ['client_referent_name'] },
      { keys: ['client_referent_phone', 'client_referent_email'] },
    ],
  },
  {
    id: 'profiel',
    title: 'Basisgegevens re-integratie werknemer',
    rows: [
      { keys: ['current_job'] },
      { keys: ['education_level', 'contract_hours'] },
      { keys: ['drivers_license', 'has_computer'], layout: ['row', 'row'] },
      {
        keys: ['dutch_speaking', 'dutch_writing', 'dutch_reading'],
        spans: ['third', 'third', 'third'],
        layout: 'stack',
      },
      { keys: ['computer_skills'] },
      { keys: ['work_experience'] },
      { keys: ['transport_type'] },
      { keys: ['other_employers'] },
    ],
  },
  {
    id: 'opdracht',
    title: 'Opdrachtinformatie',
    rows: [
      { keys: ['tp_lead_time', 'tp_start_date'] },
      { keys: ['tp_end_date'], layout: 'row' },
    ],
  },
];
