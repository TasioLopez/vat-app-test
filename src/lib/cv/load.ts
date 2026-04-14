import { createClient } from '@supabase/supabase-js';
import type { CvModel } from '@/types/cv';
import { DEFAULT_ACCENT_COLOR, type CvTemplateKey } from '@/types/cv';
import { normalizeCvPayload } from '@/lib/cv/normalize';

export type CvDocumentRow = {
  id: string;
  employee_id: string;
  title: string;
  template_key: string;
  accent_color: string;
  status: string;
  payload_json: CvModel;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function getServiceClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Load merged employee + details for seeding (service role — print/API).
 */
export async function loadEmployeeForCvSeed(employeeId: string) {
  const supabase = getServiceClient();
  const [empRes, detRes] = await Promise.all([
    supabase.from('employees').select('id, first_name, last_name, email').eq('id', employeeId).maybeSingle(),
    supabase.from('employee_details').select('*').eq('employee_id', employeeId).maybeSingle(),
  ]);
  return {
    employee: empRes.data,
    details: detRes.data,
    error: empRes.error || detRes.error,
  };
}

/**
 * Load CV document by id (service role). Validates employee_id match.
 */
export async function loadCvDocumentForPrint(cvId: string, employeeId: string): Promise<CvDocumentRow | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    payload_json: normalizeCvPayload(data.payload_json),
    template_key: data.template_key,
    accent_color: data.accent_color || DEFAULT_ACCENT_COLOR,
  } as CvDocumentRow;
}

/**
 * Full payload for editor: document row + normalized model.
 */
export async function loadCvEditorPayload(cvId: string, employeeId: string) {
  const doc = await loadCvDocumentForPrint(cvId, employeeId);
  if (!doc) return null;

  return {
    id: doc.id,
    employee_id: doc.employee_id,
    title: doc.title,
    template_key: doc.template_key as CvTemplateKey,
    accent_color: doc.accent_color,
    status: doc.status,
    payload: doc.payload_json,
    updated_at: doc.updated_at,
  };
}
