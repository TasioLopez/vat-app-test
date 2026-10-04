import type { SupabaseClient } from '@supabase/supabase-js';
import { referentToClientReferentFields, resolveReferentForEmployee } from '@/lib/referents';
import { formatOrganizationDisplayName } from '@/lib/utils';

/** Profile-linked keys — never authoritative in tp_instances.data_json. */
export const TP_PROFILE_LINKED_KEYS = [
  'employer_client_id',
  'client_name',
  'employer_name',
  'client_referent_name',
  'client_referent_phone',
  'client_referent_email',
  'client_referent_function',
  'client_referent_gender',
] as const;

export type TPProfileLinkedKey = (typeof TP_PROFILE_LINKED_KEYS)[number];

/**
 * Resolve werkgever + referent from the worker profile (employees.client_id, employees.referent_id).
 */
export async function resolveTPProfileContext(
  supabase: SupabaseClient,
  employeeId: string
): Promise<Record<string, unknown>> {
  const { data: employee } = await (supabase as any)
    .from('employees')
    .select('client_id, referent_id')
    .eq('id', employeeId)
    .maybeSingle();

  const context: Record<string, unknown> = {
    employer_client_id: employee?.client_id ?? null,
    client_name: null,
    employer_name: null,
    client_referent_name: null,
    client_referent_phone: null,
    client_referent_email: null,
    client_referent_function: null,
    client_referent_gender: null,
  };

  if (employee?.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', employee.client_id)
      .maybeSingle();

    if (client?.name) {
      context.client_name = client.name;
      context.employer_name = client.name;
    }

    const referent = await resolveReferentForEmployee(supabase, {
      referent_id: employee.referent_id,
      client_id: employee.client_id,
    });
    const refFields = referentToClientReferentFields(referent);
    context.client_referent_name = refFields.client_referent_name;
    context.client_referent_phone = refFields.client_referent_phone;
    context.client_referent_email = refFields.client_referent_email;
    context.client_referent_function = refFields.client_referent_function;
    context.client_referent_gender = refFields.client_referent_gender;
  }

  return context;
}

/** Always overwrite profile-linked keys on TP data (live from worker profile). */
export function applyTPProfileContext(
  data: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...data };
  for (const key of TP_PROFILE_LINKED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      next[key] = context[key];
    }
  }
  return next;
}

/** Remove profile-linked keys before persisting tp_instances.data_json. */
export function stripTPProfileFields(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  for (const key of TP_PROFILE_LINKED_KEYS) {
    delete next[key];
  }
  return next;
}

/** Live profile werkgever name only (ignores document override). */
export function getProfileWerkgeverName(data: Record<string, unknown>): string {
  const clientName = String(data.client_name ?? '').trim();
  if (clientName) return formatOrganizationDisplayName(clientName);
  const employerName = String(data.employer_name ?? '').trim();
  return formatOrganizationDisplayName(employerName);
}

/**
 * Canonical werkgever display name from in-memory TP data.
 * Prefers document-only `document_employer_name` when set.
 */
export function getWerkgeverName(data: Record<string, unknown>): string {
  const override = String(data.document_employer_name ?? '').trim();
  if (override) return formatOrganizationDisplayName(override);
  return getProfileWerkgeverName(data);
}

/** Document-only contact keys stored in tp_instances.data_json (not referents table). */
export const TP_DOCUMENT_REFERENT_KEYS = [
  'document_referent_name',
  'document_referent_phone',
  'document_referent_email',
  'document_referent_function',
  'document_referent_gender',
] as const;

export type TPDocumentReferentKey = (typeof TP_DOCUMENT_REFERENT_KEYS)[number];

const DOCUMENT_TO_PROFILE_REFERENT: Record<
  TPDocumentReferentKey,
  'client_referent_name' | 'client_referent_phone' | 'client_referent_email' | 'client_referent_function' | 'client_referent_gender'
> = {
  document_referent_name: 'client_referent_name',
  document_referent_phone: 'client_referent_phone',
  document_referent_email: 'client_referent_email',
  document_referent_function: 'client_referent_function',
  document_referent_gender: 'client_referent_gender',
};

/** True when any document-only referent field is set. */
export function hasDocumentReferentOverride(data: Record<string, unknown>): boolean {
  return TP_DOCUMENT_REFERENT_KEYS.some((key) => String(data[key] ?? '').trim().length > 0);
}

/**
 * Display fields for contactpersoon: document override per field, else profile.
 * Returns the same shape as profile-linked client_referent_* keys for UI/print.
 */
export function getReferentDisplayFields(data: Record<string, unknown>): {
  client_referent_name: string | null;
  client_referent_phone: string | null;
  client_referent_email: string | null;
  client_referent_function: string | null;
  client_referent_gender: string | null;
} {
  const pick = (docKey: TPDocumentReferentKey, profileKey: string): string | null => {
    const doc = String(data[docKey] ?? '').trim();
    if (doc) return doc;
    const profile = String(data[profileKey] ?? '').trim();
    return profile || null;
  };
  return {
    client_referent_name: pick('document_referent_name', 'client_referent_name'),
    client_referent_phone: pick('document_referent_phone', 'client_referent_phone'),
    client_referent_email: pick('document_referent_email', 'client_referent_email'),
    client_referent_function: pick('document_referent_function', 'client_referent_function'),
    client_referent_gender: pick('document_referent_gender', 'client_referent_gender'),
  };
}

/** Clear all document-only referent overrides. */
export function clearDocumentReferentOverrides(
  updateField: (key: string, value: unknown) => void
): void {
  for (const key of TP_DOCUMENT_REFERENT_KEYS) {
    updateField(key, '');
  }
}

/** Write a document-only referent field (for TP Gegevens edits). */
export function setDocumentReferentField(
  updateField: (key: string, value: unknown) => void,
  profileKey:
    | 'client_referent_name'
    | 'client_referent_phone'
    | 'client_referent_email'
    | 'client_referent_function'
    | 'client_referent_gender',
  value: unknown
): void {
  const entry = Object.entries(DOCUMENT_TO_PROFILE_REFERENT).find(([, p]) => p === profileKey);
  if (!entry) return;
  updateField(entry[0], value);
}

/** Push resolved profile-linked fields into TP context via updateField. */
export function syncTPProfileContextFields(
  updateField: (key: string, value: unknown) => void,
  context: Record<string, unknown>
): void {
  for (const key of TP_PROFILE_LINKED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      updateField(key, context[key]);
    }
  }
}
