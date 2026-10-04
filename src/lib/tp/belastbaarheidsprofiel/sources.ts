import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';

export type EmployeeDoc = {
  type: string | null;
  url: string | null;
  uploaded_at?: string | null;
};

export function isSeparateBelastbaarheidsDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return (
    t.includes('fml') ||
    t.includes('izp') ||
    t.includes('lab') ||
    t.includes('functiemogelijkhedenlijst') ||
    t.includes('inzetbaarheidsprofiel') ||
    t.includes('lijst arbeidsmogelijkheden')
  );
}

export function isIntakeDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return t.includes('intakeformulier') || t.includes('intake-formulier') || t.includes('intake');
}

export function isAdDoc(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return t.includes('ad_rapport') || t.includes('ad_rapportage') || t.includes('arbeidsdeskundig');
}

export function hasSeparateBelastOrSpreekuurDoc(docs: EmployeeDoc[]): boolean {
  return docs.some(
    (d) =>
      Boolean(d.url) &&
      (isSeparateBelastbaarheidsDoc(d.type) || isSpreekReportageDocType(d.type))
  );
}

export function hasIntakeDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => Boolean(d.url) && isIntakeDoc(d.type));
}

export function hasAdDoc(docs: EmployeeDoc[]): boolean {
  return docs.some((d) => Boolean(d.url) && isAdDoc(d.type));
}

/** True when any document can supply belastbaarheidsprofiel content. */
export function hasBelastbaarheidsSource(docs: EmployeeDoc[]): boolean {
  return (
    hasSeparateBelastOrSpreekuurDoc(docs) || hasIntakeDoc(docs) || hasAdDoc(docs)
  );
}
