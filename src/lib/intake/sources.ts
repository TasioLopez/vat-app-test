import type { SupabaseClient } from '@supabase/supabase-js';
import { isAdDocumentType, isFmlDocumentType } from '@/lib/document-analysis/doc-type-matchers';
import { isSpreekReportageDocType } from '@/lib/documents/employee-doc-types';
import { INTAKE_TYPE_VARIANTS } from '@/lib/document-analysis/storage';

export function isIntakeDocumentType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return INTAKE_TYPE_VARIANTS.some((variant) => t.includes(variant));
}

export function isDossierSourceType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  if (isIntakeDocumentType(type)) return false;
  return (
    isAdDocumentType(type) ||
    isFmlDocumentType(type) ||
    isSpreekReportageDocType(type) ||
    t === 'extra' ||
    t.includes('extra')
  );
}

export type IntakeSourcesSummary = {
  hasIntakePdf: boolean;
  intakeFileName: string | null;
  hasDossierDocs: boolean;
  dossierDocCount: number;
};

/** Lightweight metadata-only check (no file download). */
export async function getIntakeSourcesSummary(
  supabase: SupabaseClient,
  employeeId: string
): Promise<IntakeSourcesSummary> {
  const { data: docs } = await supabase
    .from('documents')
    .select('type, url, name, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });

  const list = docs || [];

  let intakeFileName: string | null = null;
  for (const variant of INTAKE_TYPE_VARIANTS) {
    const hit = list.find(
      (d) => (d.type || '').toLowerCase().includes(variant) && Boolean(d.url)
    );
    if (hit) {
      intakeFileName = hit.name || null;
      break;
    }
  }

  const dossierDocs = list.filter((d) => isDossierSourceType(d.type) && d.url);

  // Prefer finding by type variants even when name is empty
  const hasIntake =
    list.some((d) => isIntakeDocumentType(d.type) && Boolean(d.url));

  return {
    hasIntakePdf: hasIntake,
    intakeFileName,
    hasDossierDocs: dossierDocs.length > 0,
    dossierDocCount: dossierDocs.length,
  };
}

/** True when the draft has any user-visible content worth protecting from overwrite. */
export function intakeDraftHasContent(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const walk = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.some(walk);
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).some(([k, v]) => {
        if (k === 'meta' || k === 'conflicts' || k === 'generation_notes') return false;
        return walk(v);
      });
    }
    return false;
  };
  return walk(data);
}
