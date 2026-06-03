/** Shared option lists for Gegevens / employee profile fields. */

export const EDUCATION_LEVEL_OPTIONS = [
  'Praktijkonderwijs',
  'VMBO',
  'LTS',
  'HAVO',
  'VWO',
  'MBO 1',
  'MBO 2',
  'MTS',
  'MBO 3',
  'MBO 4',
  'HBO',
  'WO',
] as const;

export const TRANSPORT_TYPE_OPTIONS = ['Auto', 'Fiets', 'Bromfiets', 'Motor', 'OV'] as const;

export const DRIVERS_LICENSE_TYPE_OPTIONS = [
  { value: 'B', label: 'B (Auto)' },
  { value: 'C', label: 'C (Vrachtwagen)' },
  { value: 'C1', label: 'C1 (Middelgrote vrachtwagen)' },
  { value: 'D', label: 'D (Bus)' },
  { value: 'D1', label: 'D1 (Kleine bus)' },
  { value: 'E', label: 'E (Aanhangwagen)' },
  { value: 'A', label: 'A (Motor)' },
  { value: 'AM', label: 'AM (Bromfiets)' },
  { value: 'A1', label: 'A1 (Motor beperkt)' },
  { value: 'A2', label: 'A2 (Motor beperkt)' },
  { value: 'BE', label: 'BE (Auto + Aanhangwagen)' },
  { value: 'CE', label: 'CE (Vrachtwagen + Aanhangwagen)' },
  { value: 'DE', label: 'DE (Bus + Aanhangwagen)' },
  { value: 'T', label: 'T (Trekker)' },
] as const;

export const COMPUTER_SKILLS_OPTIONS = [
  { value: '1', label: '1 - Geen' },
  { value: '2', label: '2 - Basis (e-mail, browsen)' },
  { value: '3', label: '3 - Gemiddeld (Word, Excel)' },
  { value: '4', label: "4 - Geavanceerd (meerdere programma's)" },
  { value: '5', label: '5 - Expert (IT-gerelateerde vaardigheden)' },
] as const;

export const DUTCH_LANGUAGE_OPTIONS = ['Goed', 'Matig', 'Onvoldoende'] as const;

export const DRIVERS_LICENSE_TYPE_VALUES = DRIVERS_LICENSE_TYPE_OPTIONS.map((o) => o.value);
