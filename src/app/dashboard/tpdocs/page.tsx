// app/dashboard/tpdocs/page.tsx
import type { Metadata } from "next";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getEmployeeDocLabel } from "@/lib/documents/employee-doc-types";
import TPDocsClient from "./tpdocs-client";

export const metadata: Metadata = {
  title: "Documenten",
};

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  client_id: string | null;
};

type ClientRow = { id: string; name: string | null };

export type DocumentRow = {
  id: string;
  employee_id: string;
  title: string;
  url: string;
  type: string;
  typeLabel: string;
  layout_key: string | null;
  employeeName: string;
  employeeEmail: string;
  clientName: string;
  created_at: string | null;
};

const GENERATED_DOC_LABELS: Record<string, string> = {
  tp: "Trajectplan",
  intake: "Intake",
  vgr: "VGR",
};

function docTypeLabel(type: string | null | undefined): string {
  const key = (type || "").toLowerCase().trim();
  if (!key) return "Onbekend";
  if (GENERATED_DOC_LABELS[key]) return GENERATED_DOC_LABELS[key];
  return getEmployeeDocLabel(key);
}

function filenameFromUrl(path?: string | null, fallback = "Document") {
  if (!path) return fallback;
  try {
    const clean = path.replace(/^\/?documents\//i, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || fallback;
  } catch {
    return fallback;
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
      <div className="space-y-6 bg-gray-50 p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Documenten</h1>
        <p className="text-sm text-muted-foreground">Je moet ingelogd zijn om deze pagina te bekijken.</p>
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

  const { data: docs, error: docsErr } = await admin
    .from("documents")
    .select("id, employee_id, type, name, url, uploaded_at, layout_key")
    .order("uploaded_at", { ascending: false })
    .limit(1000);

  if (docsErr) {
    return (
      <div className="space-y-6 bg-gray-50 p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Documenten</h1>
        <p className="text-sm text-muted-foreground">Documenten konden niet geladen worden.</p>
      </div>
    );
  }

  const rows: DocumentRow[] = (docs || [])
    .filter((d) => employeeIds.length === 0 || employeeIds.includes(d.employee_id))
    .map((d) => {
      const emp = empMap.get(d.employee_id);
      const client = emp?.client_id ? cliMap.get(emp.client_id) : undefined;
      const employeeName = [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") || "—";
      const employeeEmail = emp?.email ?? "—";
      const clientName = client?.name ?? "—";
      const type = String(d.type || "").toLowerCase().trim() || "extra";
      const typeLabel = docTypeLabel(type);
      const title = (d.name && String(d.name).trim()) || filenameFromUrl(d.url, typeLabel);

      return {
        id: d.id,
        employee_id: d.employee_id,
        title,
        url: d.url,
        type,
        typeLabel,
        layout_key: d.layout_key ?? null,
        employeeName,
        employeeEmail,
        clientName,
        created_at: d.uploaded_at,
      };
    });

  const typeOptions = Array.from(
    new Map(rows.map((r) => [r.type, r.typeLabel])).entries()
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "nl"));

  const clientOptions = Array.from(
    new Set(rows.map((r) => r.clientName).filter((n) => n && n !== "—"))
  ).sort((a, b) => a.localeCompare(b, "nl"));

  return (
    <div className="space-y-6 bg-gray-50 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Documenten</h1>
        <p className="mt-1 text-sm text-gray-600">Beheer en bekijk documenten uit dossiers</p>
      </div>

      <TPDocsClient rows={rows} typeOptions={typeOptions} clientOptions={clientOptions} />
    </div>
  );
}
