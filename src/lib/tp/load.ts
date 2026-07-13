// src/lib/tp/load.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatEmployeeName, isAbsentText, normalizePersonName } from "@/lib/utils";
import { normalizePhoneForStorage } from "@/lib/phone/format-dutch-display";
import { applyTPProfileContext, resolveTPProfileContext } from "@/lib/tp/resolve-profile-context";

export type TPData = Record<string, any>;

const isFilled = (v: any) =>
  v !== null && v !== undefined && !isAbsentText(v);

function preferFilledMerge<T extends Record<string, any>>(...objs: T[]): T {
  const out = {} as T;
  for (const obj of objs) {
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) {
      if (isFilled(v)) (out as any)[k] = v;
    }
  }
  return out;
}

function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function loadTP(
  employeeId: string,
  opts?: { preferredConsultantUserId?: string; supabase?: SupabaseClient }
): Promise<TPData> {
  const supabase = opts?.supabase ?? createServiceClient();

  // 1) Base rows
  const [employeeResult, detailsResult, metaResult] = await Promise.all([
    (supabase as any)
      .from("employees")
      .select("id, first_name, last_name, email, client_id, referent_id")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase
      .from("employee_details")
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle(),
    supabase
      .from("tp_meta")
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle(),
  ]);

  const { data: employee } = employeeResult;
  const { data: details } = detailsResult;
  const { data: meta } = metaResult;

  // 2) Merge
  const data = preferFilledMerge<TPData>(employee || {}, details || {}, meta || {});

  // 3) Always force name from employees
  if (employee?.first_name) {
    data.first_name = normalizePersonName(employee.first_name) ?? employee.first_name;
  }
  if (employee?.last_name) {
    data.last_name = normalizePersonName(employee.last_name) ?? employee.last_name;
  }

  // 4) Werkgever + referent — always live from worker profile
  const profileContext = await resolveTPProfileContext(supabase, employeeId);
  Object.assign(data, applyTPProfileContext(data, profileContext));

  // 5) Full employee name - use formatted version with gender/title
  if (data.first_name && data.last_name) {
    data.employee_name = formatEmployeeName(
      data.first_name,
      data.last_name,
      data.gender
    );
  }

  // 6) Identity fallback
  data.employee_id ??= employee?.id ?? employeeId;

  // 7a) ✅ Prefer the CURRENT (exporting) user as loopbaanadviseur
  //     Only fill fields that are still empty.
  if (opts?.preferredConsultantUserId) {
    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("*")                 // select all, then pick what exists (phone field name may vary)
      .eq("id", opts.preferredConsultantUserId)
      .maybeSingle();

    if (meErr) {
      console.warn('Could not load preferred consultant user');
    }

    if (me) {
      const meFull = [me.first_name, me.last_name].filter(Boolean).join(" ").trim();
      const phone =
        me.phone ?? me.phone_number ?? me.mobile ?? me.mobile_phone ??
        me.telephone ?? me.tel ?? null;

      if (!isFilled(data.consultant_name) && meFull) data.consultant_name = meFull;
      if (!isFilled(data.consultant_email) && me.email) data.consultant_email = me.email;
      if (!isFilled(data.consultant_phone) && phone) data.consultant_phone = phone;
    }
  }

  for (const key of ['phone', 'consultant_phone', 'client_referent_phone'] as const) {
    if (typeof data[key] === 'string' && data[key].trim()) {
      data[key] = normalizePhoneForStorage(data[key]) ?? data[key];
    }
  }

  return data;
}

// Keep old import name working
export const loadTPData = loadTP;
