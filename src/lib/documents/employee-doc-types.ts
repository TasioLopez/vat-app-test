export const EMPLOYEE_DOC_TYPES = [
  'intakeformulier',
  'ad_rapportage',
  'fml_izp',
  'cv',
  'spreek_reportage',
  'extra',
] as const;

export type EmployeeDocType = (typeof EMPLOYEE_DOC_TYPES)[number];

export const EMPLOYEE_DOC_LABELS: Record<EmployeeDocType, string> = {
  intakeformulier: 'Intakeformulier',
  ad_rapportage: 'AD Rapport',
  fml_izp: 'FML/IZP',
  cv: 'CV',
  spreek_reportage: 'Spreekuurrapportage',
  extra: 'Overig',
};

export function getEmployeeDocLabel(type: string): string {
  return EMPLOYEE_DOC_LABELS[type as EmployeeDocType] ?? type;
}

export function isReservedEmployeeDocType(type: string | null | undefined): boolean {
  const normalized = (type || '').toLowerCase().trim();
  return EMPLOYEE_DOC_TYPES.some((docType) => docType === normalized);
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
