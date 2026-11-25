import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureVgrDossier } from './normalize';
import { emptyVgrDossier, type VgrDossier } from './types';

/**
 * Load / save pack-shaped dossier JSON keyed by employee (`vgr_dossiers`).
 * Falls back to empty dossier when table/row missing (dev without migration).
 */
export async function loadVgrDossier(
  supabase: SupabaseClient,
  employeeId: string,
): Promise<VgrDossier> {
  try {
    const { data, error } = await (supabase as any)
      .from('vgr_dossiers')
      .select('data_json')
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (error || !data?.data_json) return emptyVgrDossier(employeeId);
    return ensureVgrDossier(data.data_json, employeeId);
  } catch {
    return emptyVgrDossier(employeeId);
  }
}

export async function saveVgrDossier(
  supabase: SupabaseClient,
  dossier: VgrDossier,
): Promise<{ ok: boolean; error?: string }> {
  const shaped = ensureVgrDossier(dossier, dossier.employee_id);
  shaped.updated_at = new Date().toISOString();
  try {
    const { error } = await (supabase as any).from('vgr_dossiers').upsert(
      {
        employee_id: shaped.employee_id,
        data_json: shaped,
        updated_at: shaped.updated_at,
      },
      { onConflict: 'employee_id' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'save failed' };
  }
}
