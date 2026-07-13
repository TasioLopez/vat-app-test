import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEmployeeDetailsPayload,
  normalizeEmployeeDetailsPayload,
} from '@/lib/employee/autofill-persist';
import {
  GEGEVENS_EMPLOYEE_KEYS,
  GEGEVENS_TP2_KEYS,
} from '@/lib/tp2026/gegevens-autofill';
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

const TP_META_PERSIST_KEYS = [...GEGEVENS_TP2_KEYS, 'tp3_activities'] as const;

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
    ...pickKeys(tpData, TP_META_PERSIST_KEYS),
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

  const { error: instanceError } = await (supabase as any)
    .from('tp_instances')
    .update({
      data_json: shaped,
      updated_by: userId ?? null,
    })
    .eq('id', tpInstanceId);

  if (instanceError) {
    return { error: `tp_instances: ${instanceError.message}` };
  }

  const detailsPayload = pickGegevensEmployeeDetailsPayload(shaped, employeeId);
  const { error: detailsError } = await supabase
    .from('employee_details')
    .upsert([buildEmployeeDetailsPayload(detailsPayload, employeeId)], {
      onConflict: 'employee_id',
    });

  if (detailsError) {
    return { error: `employee_details: ${detailsError.message}` };
  }

  const metaPayload = pickGegevensTpMetaPayload(shaped, employeeId);
  const { error: metaError } = await supabase
    .from('tp_meta')
    .upsert([metaPayload], { onConflict: 'employee_id' });

  if (metaError) {
    return { error: `tp_meta: ${metaError.message}` };
  }

  const email = typeof shaped.email === 'string' ? shaped.email.trim() : '';
  if (email) {
    const { error: employeeError } = await supabase
      .from('employees')
      .update({ email })
      .eq('id', employeeId);

    if (employeeError) {
      return { error: `employees: ${employeeError.message}` };
    }
  }

  return {};
}
