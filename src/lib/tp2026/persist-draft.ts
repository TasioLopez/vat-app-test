import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEmployeeDetailsPayload,
  normalizeEmployeeDetailsPayload,
} from '@/lib/employee/autofill-persist';
import { saveWorkerFacts, stripWorkerFacts, applyWorkerFactsToDocument } from '@/lib/employee/save-worker-facts';
import { GEGEVENS_EMPLOYEE_KEYS } from '@/lib/tp2026/gegevens-autofill';
import { normalizeWorkExperienceTitles } from '@/lib/tp2026/intake-algemene-info';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';
import { stripTPProfileFields } from '@/lib/tp/resolve-profile-context';

export type PersistTp2026DraftParams = {
  tpInstanceId: string;
  employeeId: string;
  tpData: Record<string, unknown>;
  userId?: string | null;
};

export type PersistTp2026DraftResult = {
  error?: string;
};

function pickKeys(
  source: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
}

/** Keys stored on employee_details (excludes email — stored on employees). */
const DETAILS_KEYS_FOR_PERSIST = GEGEVENS_EMPLOYEE_KEYS.filter((k) => k !== 'email');

const TP_META_ACTIVITY_KEYS = ['tp3_activities'] as const;

export function pickGegevensEmployeeDetailsPayload(
  tpData: Record<string, unknown>,
  employeeId: string
) {
  return normalizeEmployeeDetailsPayload(
    pickKeys(tpData, DETAILS_KEYS_FOR_PERSIST) as Parameters<
      typeof normalizeEmployeeDetailsPayload
    >[0],
    employeeId
  );
}

export function pickGegevensTpMetaPayload(
  tpData: Record<string, unknown>,
  employeeId: string
): Record<string, unknown> {
  return {
    employee_id: employeeId,
    ...pickKeys(tpData, TP_META_ACTIVITY_KEYS),
    ...pickKeys(tpData, [
      'first_sick_day',
      'registration_date',
      'intake_date',
      'tp_creation_date',
      'has_ad_report',
      'ad_report_concept',
      'is_ex_werknemer',
      'ad_report_date',
      'occupational_doctor_name',
      'occupational_doctor_org',
      'fml_izp_lab_date',
      'fml_izp_lab_kind',
      'tp_lead_time',
      'tp_start_date',
      'tp_end_date',
    ]),
  };
}

/**
 * Persists the full TP 2026 draft: instance snapshot (PDF/builder), employee_details, tp_meta, email.
 */
export async function persistTp2026Draft(
  supabase: SupabaseClient,
  params: PersistTp2026DraftParams
): Promise<PersistTp2026DraftResult> {
  const { tpInstanceId, employeeId, tpData, userId } = params;
  const shaped = stripTPProfileFields(ensureTP2026Shape(tpData as Record<string, any>));

  if (shaped.work_experience != null) {
    const normalizedWork = normalizeWorkExperienceTitles(
      String(shaped.work_experience),
      shaped.current_job != null ? String(shaped.current_job) : undefined
    );
    shaped.work_experience = normalizedWork || '';
  }

  const saved = await saveWorkerFacts(supabase, employeeId, shaped, 'human');
  if (saved.error) return { error: saved.error };

  const stored = stripWorkerFacts(applyWorkerFactsToDocument(shaped, saved.values));

  const { error: instanceError } = await (supabase as any)
    .from('tp_instances')
    .update({
      data_json: stored,
      updated_by: userId ?? null,
    })
    .eq('id', tpInstanceId);

  if (instanceError) {
    return { error: `tp_instances: ${instanceError.message}` };
  }

  if (shaped.tp3_activities !== undefined) {
    const { error: metaError } = await supabase.from('tp_meta').upsert(
      [{ employee_id: employeeId, tp3_activities: shaped.tp3_activities }],
      { onConflict: 'employee_id' }
    );
    if (metaError) return { error: `tp_meta: ${metaError.message}` };
  }

  return {};
}
