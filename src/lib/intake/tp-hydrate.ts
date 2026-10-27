import type { SupabaseClient } from '@supabase/supabase-js';
import { INTAKE_LAYOUT_KEY, ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';
import { intakeToGegevensFields, intakeToTpNarrativeFields } from '@/lib/intake/project';
import { mergeRecordFillBlanks } from '@/lib/tp2026/gegevens-autofill';

export type ValidatedIntakeRecord = {
  id: string;
  data: IntakeData;
  validated_at: string;
};

/** Load the latest validated intake draft for an employee. */
export async function getValidatedIntakeForEmployee(
  supabase: SupabaseClient,
  employeeId: string
): Promise<ValidatedIntakeRecord | null> {
  const { data, error } = await (supabase as any)
    .from('intake_instances')
    .select('id, data_json, validated_at')
    .eq('employee_id', employeeId)
    .eq('layout_key', INTAKE_LAYOUT_KEY)
    .eq('status', 'draft')
    .not('validated_at', 'is', null)
    .maybeSingle();

  if (error || !data?.validated_at) return null;

  return {
    id: data.id as string,
    data: ensureIntakeShape(data.data_json || {}),
    validated_at: data.validated_at as string,
  };
}

/** Deterministic Gegevens/profile fields from validated intake. */
export function gegevensFromValidatedIntake(intake: IntakeData): Record<string, unknown> {
  return intakeToGegevensFields(intake);
}

export function narrativeFromValidatedIntake(intake: IntakeData): Record<string, unknown> {
  return intakeToTpNarrativeFields(intake);
}

/** Merge validated intake gegevens into TP data_json blanks only. */
export function mergeValidatedIntakeIntoTpData(
  tpData: Record<string, unknown>,
  intake: IntakeData
): Record<string, unknown> {
  const flat = intakeToGegevensFields(intake);
  return mergeRecordFillBlanks(tpData, flat);
}

export function hasNonEmptyNarrativeField(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) =>
      hasNonEmptyNarrativeField(v)
    );
  }
  return false;
}
