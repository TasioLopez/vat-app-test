// src/lib/tp/load.ts
import { createClient } from "@supabase/supabase-js";
import { formatEmployeeName, isAbsentText, normalizePersonName } from "@/lib/utils";
import { normalizePhoneForStorage } from "@/lib/phone/format-dutch-display";
import { resolveReferentForEmployee, referentToClientReferentFields } from "@/lib/referents";

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

// 👇 NEW: allow passing the “author” user id
export async function loadTP(
  employeeId: string,
  opts?: { preferredConsultantUserId?: string }
): Promise<TPData> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Loading TP data for employee:', employeeId);

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

  // 4) Client name + referent (from referents table only; tp_meta snapshot wins, then resolved referent fills blanks)
  if (employee?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", employee.client_id)
      .maybeSingle();

    if (client?.name) {
      data.client_name = client.name;
      data.employer_name = client.name;
    }

    const referent = await resolveReferentForEmployee(supabase, {
      referent_id: employee.referent_id,
      client_id: employee.client_id,
    });
    const refFields = referentToClientReferentFields(referent);
    if (!isFilled(data.client_referent_name)) data.client_referent_name = refFields.client_referent_name;
    if (!isFilled(data.client_referent_phone)) data.client_referent_phone = refFields.client_referent_phone;
    if (!isFilled(data.client_referent_email)) data.client_referent_email = refFields.client_referent_email;
    if (!isFilled(data.client_referent_function)) data.client_referent_function = refFields.client_referent_function;
    if (!isFilled(data.client_referent_gender)) data.client_referent_gender = refFields.client_referent_gender;
  }

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

    console.log("👤 Preferred consultant (current user):", me, meErr);

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

  console.log('🎯 Final merged data:', {
    employee_name: data.employee_name,
    employer_name: data.employer_name,
    client_name: data.client_name,
    client_referent_name: data.client_referent_name,
    client_referent_phone: data.client_referent_phone,
    client_referent_email: data.client_referent_email,
    consultant_name: data.consultant_name,
    consultant_phone: data.consultant_phone,
    consultant_email: data.consultant_email,
  });

  for (const key of ['phone', 'consultant_phone', 'client_referent_phone'] as const) {
    if (typeof data[key] === 'string' && data[key].trim()) {
      data[key] = normalizePhoneForStorage(data[key]) ?? data[key];
    }
  }

  return data;
}

// Keep old import name working
export const loadTPData = loadTP;
