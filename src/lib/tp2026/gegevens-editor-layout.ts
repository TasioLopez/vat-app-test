import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Building2,
  CalendarRange,
  ClipboardList,
  UserCircle,
  UserRound,
} from 'lucide-react';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026GegevensFields } from '@/lib/tp2026/schema';

export type GegevensFieldSpan = 'full' | 'half' | 'third';

export type GegevensEditorRow = {
  keys: string[];
  spans?: GegevensFieldSpan[];
  /** Optional subsection label shown above this row (inside Basisgegevens). */
  subsection?: string;
  /** Tailwind grid class override for special rows (e.g. 2+1 NL-taal). */
  gridClass?: string;
};

export type GegevensEditorSection = {
  id: string;
  title: string;
  icon: LucideIcon;
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
    icon: UserCircle,
    rows: [
      { keys: ['gender', 'date_of_birth'] },
      { keys: ['phone', 'email'] },
    ],
  },
  {
    id: 'traject',
    title: 'Gegevens re-integratietraject 2e spoor',
    icon: CalendarRange,
    rows: [
      { keys: ['first_sick_day', 'registration_date'] },
      { keys: ['intake_date', 'tp_creation_date'] },
      { keys: ['has_ad_report', 'ad_report_concept'] },
      { keys: ['ad_report_date', 'fml_izp_lab_date'] },
      { keys: ['occupational_doctor_name', 'occupational_doctor_org'] },
    ],
  },
  {
    id: 'opdrachtgever',
    title: 'Gegevens opdrachtgever',
    icon: Building2,
    rows: [
      { keys: ['client_referent_name'] },
      { keys: ['client_referent_phone', 'client_referent_email'] },
    ],
  },
  {
    id: 'adviseur',
    title: 'Loopbaanadviseur',
    icon: UserRound,
    rows: [
      { keys: ['consultant_name'] },
      { keys: ['consultant_phone', 'consultant_email'] },
    ],
  },
  {
    id: 'profiel',
    title: 'Basisgegevens re-integratie werknemer',
    icon: Briefcase,
    rows: [
      { subsection: 'Werk & opleiding', keys: ['current_job'] },
      { keys: ['work_experience'] },
      { keys: ['education_level', 'education_name'] },
      { keys: ['contract_hours'] },
      { subsection: 'Mobiliteit & vervoer', keys: ['drivers_license'] },
      { keys: ['drivers_license_type'] },
      { keys: ['transport_type'] },
      {
        subsection: 'Nederlandse taal',
        keys: ['dutch_speaking', 'dutch_writing', 'dutch_reading'],
        gridClass: 'grid grid-cols-1 gap-y-4 sm:grid-cols-2 lg:grid-cols-2 [&>*:last-child]:sm:col-span-2 [&>*:last-child]:lg:col-span-1',
      },
      { subsection: 'Computer', keys: ['has_computer'] },
      { keys: ['computer_skills'] },
      { subsection: 'Overig', keys: ['other_employers'] },
    ],
  },
  {
    id: 'opdracht',
    title: 'Opdrachtinformatie',
    icon: ClipboardList,
    rows: [
      {
        keys: ['tp_lead_time', 'tp_start_date', 'tp_end_date'],
        gridClass: 'grid grid-cols-1 gap-y-4 sm:grid-cols-2 lg:grid-cols-3',
      },
    ],
  },
];
