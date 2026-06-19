// app/dashboard/tpdocs/page.tsx
import type { Metadata } from "next";
import { cookies as nextCookies } from "next/headers";

export const metadata: Metadata = {
  title: "TP-documenten",
};
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

type Row = {
  id: string;
  employee_id: string;
  title: string;
  url: string;
  layout_key: string | null;
  employeeName: string;
  employeeEmail: string;
  clientName: string;
  created_at: string | null;
};

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
  const cookieStore = await nextCookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value }, db: { schema: "public" } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">TP Documents</h1>
        <p className="mt-4 text-sm text-muted-foreground">You must be signed in to view this page.</p>
      </div>
    );
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email, client_id");

  const employeeIds = (employees || []).map((e) => e.id);

  const clientIds = Array.from(
    new Set((employees || []).map((e) => e.client_id).filter(Boolean) as string[])
  );

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);

  const empMap = new Map<string, EmployeeRow>();
  (employees || []).forEach((e) => empMap.set(e.id, e as EmployeeRow));

  const cliMap = new Map<string, ClientRow>();
  (clients || []).forEach((c) => cliMap.set(c.id, c as ClientRow));

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tpDocs, error: docsErr } = await admin
    .from("documents")
    .select("id, employee_id, type, name, url, uploaded_at, layout_key")
    .eq("type", "tp")
    .order("uploaded_at", { ascending: false })
    .limit(1000);

  if (docsErr || !tpDocs || tpDocs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">TP Documents</h1>
        <p className="mt-4 text-sm">No TP documents found.</p>
      </div>
    );
  }

  const rows: Row[] = tpDocs
    .filter((d) => employeeIds.length === 0 || employeeIds.includes(d.employee_id))
    .map((d) => {
      const emp = empMap.get(d.employee_id);
      const client = emp?.client_id ? cliMap.get(emp.client_id) : undefined;
      const employeeName = [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") || "—";
      const employeeEmail = emp?.email ?? "—";
      const clientName = client?.name ?? "—";
      const title = filenameFromUrl(d.url);

      return {
        id: d.id,
        employee_id: d.employee_id,
        title,
        url: d.url,
        layout_key: d.layout_key ?? null,
        employeeName,
        employeeEmail,
        clientName,
        created_at: d.uploaded_at,
      };
    });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">TP Documents</h1>
        <p className="text-muted-foreground mt-2">Beheer en bekijk trajectplan documenten</p>
      </div>

      <TPDocsClient rows={rows} />

      <p className="text-sm text-muted-foreground">Showing {rows.length} document(s).</p>
    </div>
  );
}
