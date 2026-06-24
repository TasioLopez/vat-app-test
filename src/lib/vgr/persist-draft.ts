import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureVGRShape } from '@/lib/vgr/mapping';

export type PersistVgrDraftParams = {
  vgrInstanceId: string;
  employeeId: string;
  vgrData: Record<string, unknown>;
  userId?: string | null;
};

export type PersistVgrDraftResult = {
  error?: string;
};

export async function persistVgrDraft(
  supabase: SupabaseClient,
  params: PersistVgrDraftParams
): Promise<PersistVgrDraftResult> {
  const { vgrInstanceId, employeeId, vgrData, userId } = params;
  const shaped = ensureVGRShape(vgrData as Record<string, any>);

  const { error: instanceError } = await (supabase as any)
    .from('vgr_instances')
    .update({
      data_json: shaped,
      updated_by: userId ?? null,
    })
    .eq('id', vgrInstanceId)
    .eq('employee_id', employeeId);

  if (instanceError) {
    return { error: `vgr_instances: ${instanceError.message}` };
  }

  return {};
}
