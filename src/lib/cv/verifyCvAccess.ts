import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures the CV row exists for this employee and returns true if accessible under RLS.
 */
export async function verifyCvDocumentAccess(
  supabase: SupabaseClient,
  employeeId: string,
  cvId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('cv_documents')
    .select('id')
    .eq('id', cvId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  return !error && Boolean(data);
}
