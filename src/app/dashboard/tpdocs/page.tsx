// app/dashboard/tpdocs/page.tsx
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import TPDocsClient from "./tpdocs-client";

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  client_id: string | null;
};

type ClientRow = { id: string; name: string | null };
type UserRow = { id: string; role: "admin" | "standard" | string };

type Row = {
  id: string;                 // doc id from table
  employee_id: string;
  title: string;              // derived from URL if name is unreliable
  url: string;                // documents/<employee_id>/<file>.pdf
  employeeName: string;
  employeeEmail: string;
  clientName: string;
  created_at: string | null;  // uploaded_at from table
};

// helper: get filename from the storage path
function filenameFromUrl(path?: string | null) {
  if (!path) return "Trajectplan";
  try {
    const clean = path.replace(/^\/?documents\//i, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || "Trajectplan";
  } catch {
    return "Trajectplan";
  }
}

export default async function TPDocsPage() {
  // --- SSR client for auth + regular DB reads ---
  const cookieStore = await nextCookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value }, db: { schema: "public" } }
  );

  // --- Current user ---
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">TP Documents</h1>
        <p className="mt-4 text-sm text-muted-foreground">You must be signed in to view this page.</p>
      </div>
    );
  }

  // --- Role ---
  const { data: me } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = (me?.role as UserRow["role"]) === "admin";

  // --- Which employees are visible? ---
  let employeeIds: string[] = [];
  if (isAdmin) {
    const { data: allEmps } = await supabase.from("employees").select("id");
    employeeIds = (allEmps || []).map((e: any) => e.id);
  } else {
    const { data: links } = await supabase
      .from("employee_users")
      .select("employee_id")
      .eq("user_id", user.id);
    employeeIds = (links || []).map((r: any) => r.employee_id);
    if (employeeIds.length === 0) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">TP Documents</h1>
          <p className="mt-4 text-sm">No employees are assigned to you yet.</p>
        </div>
      );
    }
  }

  // --- Enrich maps (employees + clients) ---
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email, client_id")
    .in("id", employeeIds);

  const clientIds = Array.from(
    new Set((employees || []).map((e) => e.client_id).filter(Boolean) as string[])
  );

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);

  const empMap = new Map<string, EmployeeRow>();
  (employees || []).forEach((e: any) => empMap.set(e.id, e as EmployeeRow));

  const cliMap = new Map<string, ClientRow>();
  (clients || []).forEach((c: any) => cliMap.set(c.id, c as ClientRow));

  // --- Admin client (service role) to read the documents table safely even if RLS is strict ---
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only secret
  );

  // Query ONLY TP docs from the table, then we will preview those files from Storage via signed URLs
  const docsQuery = admin
    .from("documents")
    .select("id, employee_id, type, name, url, uploaded_at")
    .eq("type", "tp")
    .order("uploaded_at", { ascending: false })
    .limit(1000);

  const { data: tpDocs, error: docsErr } = isAdmin
    ? await docsQuery
    : await docsQuery.in("employee_id", employeeIds);

  if (docsErr || !tpDocs || tpDocs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">TP Documents</h1>
        <p className="mt-4 text-sm">No TP documents found.</p>
      </div>
    );
  }

  // --- Build rows for the client table/modal ---
  const rows: Row[] = tpDocs.map((d: any) => {
    const emp = empMap.get(d.employee_id);
    const client = emp?.client_id ? cliMap.get(emp.client_id) : undefined;
    const employeeName = [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") || "—";
    const employeeEmail = emp?.email ?? "—";
    const clientName = client?.name ?? "—";

    // Use filename from the URL (since table 'name' may not match storage name)
    const title = filenameFromUrl(d.url);

    return {
      id: d.id,
      employee_id: d.employee_id,
      title,
      url: d.url,                // e.g. "documents/<employee_id>/<file>.pdf"
      employeeName,
      employeeEmail,
      clientName,
      created_at: d.uploaded_at, // show when it was added
    };
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">TP Documents</h1>
      </div>

      <TPDocsClient rows={rows} />

      <p className="mt-3 text-xs text-gray-500">Showing {rows.length} document(s).</p>
    </div>
  );
}
