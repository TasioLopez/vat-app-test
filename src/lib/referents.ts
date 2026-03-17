/**
 * Resolve the referent (contact person) for an employee.
 * Used by TP load, inleiding autofill, and TPPreview.
 * Referents only: no fallback to clients.referent_*.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReferentRow = {
  id: string;
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  referent_function: string | null;
  gender: string | null;
  display_order: number | null;
  is_default: boolean;
  created_at: string | null;
};

/**
 * Resolve referent for an employee: use employee.referent_id if set,
 * else the client's default referent (is_default = true). Returns null if none.
 */
export async function resolveReferentForEmployee(
  supabase: SupabaseClient,
  employee: { referent_id?: string | null; client_id?: string | null }
): Promise<ReferentRow | null> {
  if (!employee?.client_id) return null;

  if (employee.referent_id) {
    const { data, error } = await supabase
      .from("referents")
      .select("*")
      .eq("id", employee.referent_id)
      .maybeSingle();
    if (!error && data) return data as ReferentRow;
  }

  const { data, error } = await supabase
    .from("referents")
    .select("*")
    .eq("client_id", employee.client_id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  if (!error && data) return data as ReferentRow;

  return null;
}

/**
 * Map a referent row to TP client_referent_* fields (and gender for inleiding).
 */
export function referentToClientReferentFields(ref: ReferentRow | null): {
  client_referent_name: string | null;
  client_referent_phone: string | null;
  client_referent_email: string | null;
  client_referent_function: string | null;
  client_referent_gender: string | null;
} {
  if (!ref) {
    return {
      client_referent_name: null,
      client_referent_phone: null,
      client_referent_email: null,
      client_referent_function: null,
      client_referent_gender: null,
    };
  }
  const fullName = [ref.first_name, ref.last_name].filter(Boolean).join(" ").trim() || null;
  return {
    client_referent_name: fullName,
    client_referent_phone: ref.phone ?? null,
    client_referent_email: ref.email ?? null,
    client_referent_function: ref.referent_function ?? null,
    client_referent_gender: ref.gender ?? null,
  };
}
