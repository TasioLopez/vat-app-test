import type { SupabaseClient } from '@supabase/supabase-js';
import { saveWorkerFacts, type SkippedValidatedField } from '@/lib/employee/save-worker-facts';
import { persistReferentFromTpData } from '@/lib/referents';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import { intakeToGegevensFields } from '@/lib/intake/project';
import { blankIntakeSharedFacts, intakeSharedFacts } from '@/lib/intake/worker-overlay';

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
  skippedValidated?: SkippedValidatedField[];
  values?: Record<string, unknown>;
};

async function projectIntakeToEmployeeTables(
  supabase: SupabaseClient,
  employeeId: string,
  intakeData: IntakeData,
  mode: 'human' | 'autofill'
): Promise<{ error?: string; skippedValidated?: SkippedValidatedField[]; values?: Record<string, unknown> }> {
  const flat = intakeSharedFacts(intakeData);
  const saved = await saveWorkerFacts(supabase, employeeId, flat, mode);
  if (saved.error) return { error: saved.error };

  const referentSource = intakeToGegevensFields(intakeData);
  const referentResult = await persistReferentFromTpData(supabase, employeeId, referentSource);
  if (referentResult.error) return { error: referentResult.error };

  return { skippedValidated: saved.skippedValidated, values: saved.values };
}

export async function persistIntakeDraft(
  supabase: SupabaseClient,
  params: PersistIntakeDraftParams
): Promise<PersistIntakeDraftResult> {
  const { intakeInstanceId, employeeId, userId, validate } = params;
  const shaped = ensureIntakeShape(params.intakeData);

  const projectResult = await projectIntakeToEmployeeTables(
    supabase,
    employeeId,
    shaped,
    validate ? 'autofill' : 'human'
  );
  if (projectResult.error) return { error: projectResult.error };

  const updatePayload: Record<string, unknown> = {
    data_json: blankIntakeSharedFacts(shaped),
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

  return { validated_at: validatedAt, skippedValidated: projectResult.skippedValidated, values: projectResult.values };
}
