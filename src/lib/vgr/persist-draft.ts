import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import type { VGRData, VGRStatus } from '@/lib/vgr/schema';

export type PersistVgrDraftParams = {
  vgrInstanceId: string;
  employeeId: string;
  vgrData: Record<string, unknown>;
  userId?: string | null;
  status?: VGRStatus;
};

export type PersistVgrDraftResult = {
  error?: string;
};

const dateOrNull = (v: unknown): string | null => {
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/** Denormalized columns mirrored from data_json.vgr_meta (see migration *_vgr_report_meta.sql). */
export function vgrMetaToColumns(data: VGRData): Record<string, unknown> {
  const m = data.vgr_meta;
  return {
    period_start: dateOrNull(m.period_start),
    period_end: dateOrNull(m.period_end),
    report_date: dateOrNull(m.report_date),
    linked_tp_instance_id: m.linked_tp_instance_id || null,
    prior_vgr_instance_id: m.prior_vgr_instance_id || null,
    prior_vgr_export_id: m.prior_vgr_export_id || null,
    version: m.version || 1,
    schema_version: m.schema_version,
  };
}

export async function persistVgrDraft(
  supabase: SupabaseClient,
  params: PersistVgrDraftParams
): Promise<PersistVgrDraftResult> {
  const { vgrInstanceId, employeeId, vgrData, userId, status } = params;
  const shaped = ensureVGRShape(vgrData as Record<string, any>);

  const { error: instanceError } = await (supabase as any)
    .from('vgr_instances')
    .update({
      data_json: shaped,
      ...vgrMetaToColumns(shaped),
      ...(status ? { status } : {}),
      updated_by: userId ?? null,
    })
    .eq('id', vgrInstanceId)
    .eq('employee_id', employeeId);

  if (instanceError) {
    return { error: `vgr_instances: ${instanceError.message}` };
  }

  return {};
}
