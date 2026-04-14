import type { SupabaseClient } from '@supabase/supabase-js';
import type { CvModel } from '@/types/cv';
import { DEFAULT_ACCENT_COLOR, type CvTemplateKey } from '@/types/cv';
import { seedCvModelFromEmployee } from '@/lib/cv/seed';

export type CvDocumentListItem = {
  id: string;
  employee_id: string;
  title: string;
  template_key: string;
  accent_color: string;
  updated_at: string;
  created_at: string;
};

/**
 * List CV documents for an employee (browser client + RLS).
 */
export async function listCvDocuments(supabase: SupabaseClient, employeeId: string) {
  const { data, error } = await supabase
    .from('cv_documents')
    .select('id, employee_id, title, template_key, accent_color, updated_at, created_at')
    .eq('employee_id', employeeId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CvDocumentListItem[];
}

export async function getCvDocument(
  supabase: SupabaseClient,
  cvId: string,
  employeeId: string
) {
  const { data, error } = await supabase
    .from('cv_documents')
    .select('*')
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

type CreateCvInput = {
  employeeId: string;
  title?: string;
  templateKey?: CvTemplateKey;
  accentColor?: string;
  seedPayload?: CvModel;
};

/**
 * Create a new CV row; optionally seed from pre-fetched employee + details.
 */
export async function createCvDocument(
  supabase: SupabaseClient,
  input: CreateCvInput,
  opts?: { employee?: any; details?: any }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let payload: CvModel;
  if (input.seedPayload) {
    payload = input.seedPayload;
  } else if (opts?.employee) {
    payload = seedCvModelFromEmployee(opts.employee, opts.details ?? null);
  } else {
    const empRes = await supabase
      .from('employees')
      .select('first_name, last_name, email')
      .eq('id', input.employeeId)
      .maybeSingle();
    const detRes = await supabase.from('employee_details').select('*').eq('employee_id', input.employeeId).maybeSingle();
    payload = seedCvModelFromEmployee(empRes.data ?? {}, detRes.data ?? null);
  }

  const { data, error } = await supabase
    .from('cv_documents')
    .insert({
      employee_id: input.employeeId,
      title: input.title ?? 'CV',
      template_key: input.templateKey ?? 'modern_professional',
      accent_color: input.accentColor ?? DEFAULT_ACCENT_COLOR,
      status: 'draft',
      payload_json: payload as unknown as Record<string, unknown>,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data!.id as string;
}

export async function updateCvDocument(
  supabase: SupabaseClient,
  cvId: string,
  employeeId: string,
  patch: {
    title?: string;
    template_key?: CvTemplateKey;
    accent_color?: string;
    payload_json?: CvModel;
    saveVersion?: boolean;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.template_key !== undefined) updates.template_key = patch.template_key;
  if (patch.accent_color !== undefined) updates.accent_color = patch.accent_color;
  if (patch.payload_json !== undefined) {
    updates.payload_json = patch.payload_json as unknown as Record<string, unknown>;
  }

  const { data, error } = await supabase
    .from('cv_documents')
    .update(updates)
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .select('id, updated_at')
    .single();

  if (error) throw error;

  if (patch.saveVersion && patch.payload_json) {
    await supabase.from('cv_versions').insert({
      cv_document_id: cvId,
      payload_json: patch.payload_json as unknown as Record<string, unknown>,
      created_by: user?.id ?? null,
    });
  }

  return data;
}

export async function deleteCvDocument(supabase: SupabaseClient, cvId: string, employeeId: string) {
  const { error } = await supabase.from('cv_documents').delete().eq('id', cvId).eq('employee_id', employeeId);
  if (error) throw error;
}

/**
 * Duplicate an existing CV (new row, same payload).
 */
export async function duplicateCvDocument(
  supabase: SupabaseClient,
  cvId: string,
  employeeId: string,
  newTitle?: string
) {
  const row = await getCvDocument(supabase, cvId, employeeId);
  if (!row) throw new Error('CV not found');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = newTitle ?? `${(row as { title: string }).title} (kopie)`;

  const { data, error } = await supabase
    .from('cv_documents')
    .insert({
      employee_id: employeeId,
      title,
      template_key: (row as { template_key: string }).template_key,
      accent_color: (row as { accent_color: string }).accent_color ?? DEFAULT_ACCENT_COLOR,
      status: 'draft',
      payload_json: (row as { payload_json: CvModel }).payload_json as unknown as Record<string, unknown>,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data!.id as string;
}
