import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEmployeeDetailsPayload,
  normalizeEmployeeDetailsPayload,
} from '@/lib/employee/autofill-persist';
import {
  GEGEVENS_EMPLOYEE_KEYS,
  GEGEVENS_TP2_KEYS,
} from '@/lib/tp2026/gegevens-autofill';
import { persistReferentFromTpData } from '@/lib/referents';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import { intakeToGegevensFields } from '@/lib/intake/project';

export type PersistIntakeDraftParams = {
  intakeInstanceId: string;
  employeeId: string;
  intakeData: IntakeData | Record<string, unknown>;
  userId?: string | null;
  /** When true, also project profile/meta/referents and set validated_at. */
  validate?: boolean;
};

export type PersistIntakeDraftResult = {
  error?: string;
  validated_at?: string | null;
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

const DETAILS_KEYS = GEGEVENS_EMPLOYEE_KEYS.filter((k) => k !== 'email');

async function projectIntakeToEmployeeTables(
  supabase: SupabaseClient,
  employeeId: string,
  intakeData: IntakeData
): Promise<{ error?: string }> {
  const flat = intakeToGegevensFields(intakeData);

  const detailsPayload = normalizeEmployeeDetailsPayload(
    pickKeys(flat, DETAILS_KEYS) as Parameters<typeof normalizeEmployeeDetailsPayload>[0],
    employeeId
  );

  const { error: detailsError } = await supabase
    .from('employee_details')
    .upsert([buildEmployeeDetailsPayload(detailsPayload, employeeId)], {
      onConflict: 'employee_id',
    });
  if (detailsError) return { error: `employee_details: ${detailsError.message}` };

  const metaPayload = {
    employee_id: employeeId,
    ...pickKeys(flat, GEGEVENS_TP2_KEYS),
  };
  const { error: metaError } = await supabase
    .from('tp_meta')
    .upsert([metaPayload], { onConflict: 'employee_id' });
  if (metaError) return { error: `tp_meta: ${metaError.message}` };

  const email = typeof flat.email === 'string' ? flat.email.trim() : '';
  if (email) {
    const { error: employeeError } = await supabase
      .from('employees')
      .update({ email })
      .eq('id', employeeId);
    if (employeeError) return { error: `employees: ${employeeError.message}` };
  }

  const referentResult = await persistReferentFromTpData(supabase, employeeId, flat);
  if (referentResult.error) return { error: referentResult.error };

  return {};
}

export async function persistIntakeDraft(
  supabase: SupabaseClient,
  params: PersistIntakeDraftParams
): Promise<PersistIntakeDraftResult> {
  const { intakeInstanceId, employeeId, userId, validate } = params;
  const shaped = ensureIntakeShape(params.intakeData);

  const updatePayload: Record<string, unknown> = {
    data_json: shaped,
    updated_by: userId ?? null,
  };

  let validatedAt: string | null = null;
  if (validate) {
    validatedAt = new Date().toISOString();
    updatePayload.validated_at = validatedAt;
    updatePayload.validated_by = userId ?? null;
  }

  const { error: instanceError } = await (supabase as any)
    .from('intake_instances')
    .update(updatePayload)
    .eq('id', intakeInstanceId);

  if (instanceError) {
    return { error: `intake_instances: ${instanceError.message}` };
  }

  if (validate) {
    const projectResult = await projectIntakeToEmployeeTables(supabase, employeeId, shaped);
    if (projectResult.error) return { error: projectResult.error };
  }

  return { validated_at: validatedAt };
}
