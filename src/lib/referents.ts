/**
 * Resolve the referent (contact person) for an employee.
 * Used by inleiding autofill and related TP contact fields.
 * Referents only: no fallback to clients.referent_*.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { splitContactPersonName } from "@/lib/document-analysis/nullSafeDetails";
import { normalizePhoneForStorage } from "@/lib/phone/format-dutch-display";
import { normalizePersonName } from "@/lib/utils";

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

export type TpReferentContactFields = {
  client_referent_name?: unknown;
  client_referent_phone?: unknown;
  client_referent_email?: unknown;
  client_referent_function?: unknown;
  client_referent_gender?: unknown;
};

export type ReferentWritePayload = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  referent_function?: string | null;
  gender?: string | null;
};

/** Build referent columns from TP Gegevens opdrachtgever fields. */
export function referentPayloadFromTpFields(
  fields: TpReferentContactFields,
  options?: { includeOptionalProfileFields?: boolean }
): ReferentWritePayload {
  const split = splitContactPersonName(String(fields.client_referent_name ?? ""));
  const payload: ReferentWritePayload = {
    first_name: normalizePersonName(split.first_name),
    last_name: normalizePersonName(split.last_name),
    phone: normalizePhoneForStorage(fields.client_referent_phone as string | null | undefined),
    email: String(fields.client_referent_email ?? "").trim() || null,
  };
  if (options?.includeOptionalProfileFields) {
    const fn = String(fields.client_referent_function ?? "").trim();
    const gender = String(fields.client_referent_gender ?? "").trim();
    payload.referent_function = fn || null;
    payload.gender = gender || null;
  }
  return payload;
}

export function referentPayloadHasContact(payload: ReferentWritePayload): boolean {
  return Boolean(payload.first_name || payload.last_name || payload.phone || payload.email);
}

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
    const { data, error } = await (supabase as any)
      .from("referents")
      .select("*")
      .eq("id", employee.referent_id)
      .maybeSingle();
    if (!error && data) return data as ReferentRow;
  }

  const { data, error } = await (supabase as any)
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
    client_referent_phone: normalizePhoneForStorage(ref.phone),
    client_referent_email: ref.email ?? null,
    client_referent_function: ref.referent_function ?? null,
    client_referent_gender: ref.gender ?? null,
  };
}

async function linkEmployeeReferent(
  supabase: SupabaseClient,
  employeeId: string,
  referentId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("employees")
    .update({ referent_id: referentId })
    .eq("id", employeeId);
  if (error) return { error: `employees: ${error.message}` };
  return {};
}

/**
 * Update the employee's linked referent from TP contact fields, or create one if missing.
 * Does not create a second referent when one already resolves (use createAndLinkReferentFromTpData).
 */
export async function persistReferentFromTpData(
  supabase: SupabaseClient,
  employeeId: string,
  tpData: TpReferentContactFields
): Promise<{ error?: string; referentId?: string | null }> {
  const { data: employee, error: employeeError } = await (supabase as any)
    .from("employees")
    .select("client_id, referent_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) return { error: `employees: ${employeeError.message}` };
  if (!employee?.client_id) return { referentId: null };

  const payload = referentPayloadFromTpFields(tpData);
  if (!referentPayloadHasContact(payload)) return { referentId: employee.referent_id ?? null };

  const existing = await resolveReferentForEmployee(supabase, {
    referent_id: employee.referent_id,
    client_id: employee.client_id,
  });

  if (existing) {
    const { error: updateError } = await (supabase as any)
      .from("referents")
      .update({
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        email: payload.email,
      })
      .eq("id", existing.id);
    if (updateError) return { error: `referents: ${updateError.message}` };

    if (employee.referent_id !== existing.id) {
      const link = await linkEmployeeReferent(supabase, employeeId, existing.id);
      if (link.error) return link;
    }
    return { referentId: existing.id };
  }

  const { data: existingList, error: listError } = await (supabase as any)
    .from("referents")
    .select("id")
    .eq("client_id", employee.client_id);
  if (listError) return { error: `referents: ${listError.message}` };

  const { data: created, error: insertError } = await (supabase as any)
    .from("referents")
    .insert({
      client_id: employee.client_id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone,
      email: payload.email,
      referent_function: null,
      gender: null,
      is_default: !existingList || existingList.length === 0,
    })
    .select("id")
    .single();

  if (insertError) return { error: `referents: ${insertError.message}` };

  const link = await linkEmployeeReferent(supabase, employeeId, created.id);
  if (link.error) return link;
  return { referentId: created.id as string };
}

/**
 * Always insert a new referent from TP fields and link the employee to it.
 */
export async function createAndLinkReferentFromTpData(
  supabase: SupabaseClient,
  employeeId: string,
  tpData: TpReferentContactFields
): Promise<{ error?: string; referentId?: string }> {
  const { data: employee, error: employeeError } = await (supabase as any)
    .from("employees")
    .select("client_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) return { error: `employees: ${employeeError.message}` };
  if (!employee?.client_id) {
    return { error: "Werknemer heeft geen werkgever; contactpersoon kan niet worden aangemaakt." };
  }

  const payload = referentPayloadFromTpFields(tpData, { includeOptionalProfileFields: true });
  if (!referentPayloadHasContact(payload)) {
    return { error: "Vul minimaal een naam, telefoon of e-mail in voor de nieuwe contactpersoon." };
  }

  const { data: existingList, error: listError } = await (supabase as any)
    .from("referents")
    .select("id")
    .eq("client_id", employee.client_id);
  if (listError) return { error: `referents: ${listError.message}` };

  const { data: created, error: insertError } = await (supabase as any)
    .from("referents")
    .insert({
      client_id: employee.client_id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone,
      email: payload.email,
      referent_function: payload.referent_function ?? null,
      gender: payload.gender ?? null,
      is_default: !existingList || existingList.length === 0,
    })
    .select("id")
    .single();

  if (insertError) return { error: `referents: ${insertError.message}` };

  const link = await linkEmployeeReferent(supabase, employeeId, created.id);
  if (link.error) return link;
  return { referentId: created.id as string };
}
