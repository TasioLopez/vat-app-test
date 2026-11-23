export const EMPLOYEE_DOC_TYPES = [
  'intakeformulier',
  'aanmeldformulier',
  'ad_rapportage',
  'fml_izp',
  'cv',
  'spreek_reportage',
  'gespreksverslag',
  'gespreksverslag_vgr',
  'extra',
] as const;

export type EmployeeDocType = (typeof EMPLOYEE_DOC_TYPES)[number];

export const EMPLOYEE_DOC_LABELS: Record<EmployeeDocType, string> = {
  intakeformulier: 'Intakeformulier',
  aanmeldformulier: 'Aanmeldformulier',
  ad_rapportage: 'AD Rapport',
  fml_izp: 'FML/IZP',
  cv: 'CV',
  spreek_reportage: 'Spreekuurrapportage',
  gespreksverslag: 'Gesprek',
  gespreksverslag_vgr: 'Gesprek VGR',
  extra: 'Overig',
};

const STAGING_ONLY_DOC_TYPES = new Set<EmployeeDocType>([
  'gespreksverslag',
  'gespreksverslag_vgr',
]);

/** Staging shows gesprek bron slots. Production keeps the previous list. */
export function visibleEmployeeDocTypes(): EmployeeDocType[] {
  if (process.env.NEXT_PUBLIC_APP_ENV === 'staging') return [...EMPLOYEE_DOC_TYPES];
  return EMPLOYEE_DOC_TYPES.filter((type) => !STAGING_ONLY_DOC_TYPES.has(type));
}

export function getEmployeeDocLabel(type: string): string {
  return EMPLOYEE_DOC_LABELS[type as EmployeeDocType] ?? type;
}

export function isReservedEmployeeDocType(type: string | null | undefined): boolean {
  const normalized = (type || '').toLowerCase().trim();
  return EMPLOYEE_DOC_TYPES.some((docType) => docType === normalized);
}

/** Intake bron only — not the VGR gesprek document. */
export function isGespreksverslagDocType(type: string | null | undefined): boolean {
  const normalized = (type || '').toLowerCase().trim();
  return normalized === 'gespreksverslag';
}

export function isGespreksverslagVgrDocType(type: string | null | undefined): boolean {
  const normalized = (type || '').toLowerCase().trim();
  return normalized === 'gespreksverslag_vgr';
}

export function isSpreekReportageDocType(type: string | null | undefined): boolean {
  const normalized = (type || '').toLowerCase().trim();
  return (
    normalized === 'spreek_reportage' ||
    normalized.includes('spreek_reportage') ||
    normalized === 'spreekuurrapportage' ||
    normalized.includes('spreekuurrapportage') ||
    normalized === 'spreekuur_rapportage' ||
    normalized.includes('spreekuur_rapportage')
  );
}

export function isCvEmployeeDocType(type: string | null | undefined): boolean {
  const normalized = (type || '').toLowerCase().trim();
  return normalized === 'cv' || normalized.includes('curriculum');
}
