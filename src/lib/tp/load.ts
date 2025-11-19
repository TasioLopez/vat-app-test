// src/lib/tp/load.ts
import { createClient } from "@supabase/supabase-js";
import { formatEmployeeName } from "@/lib/utils";

export type TPData = Record<string, any>;

const isFilled = (v: any) =>
  v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");

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
    supabase
      .from("employees")
      .select("id, first_name, last_name, email, client_id")
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
  if (employee?.first_name) data.first_name = employee.first_name;
  if (employee?.last_name) data.last_name = employee.last_name;

  // 4) Client + referent (unchanged)
  if (employee?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name, referent_first_name, referent_last_name, referent_phone, referent_email")
      .eq("id", employee.client_id)
      .maybeSingle();

    if (client?.name) {
      data.client_name = client.name;
      data.employer_name = client.name;
    }

    const referentFull = [client?.referent_first_name, client?.referent_last_name]
      .filter(Boolean).join(" ").trim();
    if (!isFilled(data.client_referent_name) && referentFull) data.client_referent_name = referentFull;
    if (!isFilled(data.client_referent_phone) && client?.referent_phone) data.client_referent_phone = client.referent_phone;
    if (!isFilled(data.client_referent_email) && client?.referent_email) data.client_referent_email = client.referent_email;
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

  // 7b) Fallback: employee_users → users (only if still missing)
  if (!isFilled(data.consultant_name) || !isFilled(data.consultant_email) || !isFilled(data.consultant_phone)) {
    try {
      const { data: eu } = await supabase
        .from("employee_users")
        .select("user_id")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: true })
        .limit(1);

      const consultantUserId = eu?.[0]?.user_id;
      if (consultantUserId) {
        const { data: consultant } = await supabase
          .from("users")
          .select("*")
          .eq("id", consultantUserId)
          .maybeSingle();

        console.log("👤 Fallback consultant via employee_users:", consultant);

        if (consultant) {
          const cFull = [consultant.first_name, consultant.last_name].filter(Boolean).join(" ").trim();
          const phone =
            consultant.phone ?? consultant.phone_number ?? consultant.mobile ??
            consultant.mobile_phone ?? consultant.telephone ?? consultant.tel ?? null;

          if (!isFilled(data.consultant_name) && cFull) data.consultant_name = cFull;
          if (!isFilled(data.consultant_email) && consultant.email) data.consultant_email = consultant.email;
          if (!isFilled(data.consultant_phone) && phone) data.consultant_phone = phone;
        }
      }
    } catch (e) {
      console.log("⚠️ Failed consultant fallback:", e);
    }
  }

  // 7c) Fallback from tp_meta: consultant_user_id or created_by
  if (!isFilled(data.consultant_name) || !isFilled(data.consultant_email) || !isFilled(data.consultant_phone)) {
    const candidateUserId =
      (meta as any)?.consultant_user_id ||
      (meta as any)?.created_by ||
      null;

    if (candidateUserId) {
      const { data: cMeta } = await supabase
        .from("users")
        .select("*")
        .eq("id", candidateUserId)
        .maybeSingle();

      console.log("👤 Meta-based consultant:", cMeta);

      if (cMeta) {
        const cFull = [cMeta.first_name, cMeta.last_name].filter(Boolean).join(" ").trim();
        const phone =
          cMeta.phone ?? cMeta.phone_number ?? cMeta.mobile ??
          cMeta.mobile_phone ?? cMeta.telephone ?? cMeta.tel ?? null;

        if (!isFilled(data.consultant_name) && cFull) data.consultant_name = cFull;
        if (!isFilled(data.consultant_email) && cMeta.email) data.consultant_email = cMeta.email;
        if (!isFilled(data.consultant_phone) && phone) data.consultant_phone = phone;
      }
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

  return data;
}

// Keep old import name working
export const loadTPData = loadTP;
