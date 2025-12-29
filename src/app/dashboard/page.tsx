import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { StatCard } from "@/components/ui/card";

type User = Database["public"]["Tables"]["users"]["Row"];
type Client = Database["public"]["Tables"]["clients"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];
type TpDoc = Database["public"]["Tables"]["tp_docs"]["Row"];

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  // Get current user and their role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-error-600 p-6">Unauthorized</div>;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return <div className="text-error-600 p-6">User profile not found.</div>;
  }

  let users: User[] = [];
  let clients: Client[] = [];
  let employees: Employee[] = [];
  let tpDocs: TpDoc[] = [];

  if (profile.role === "admin") {
    // Admin sees everything
    const [usersRes, clientsRes, employeesRes, tpDocsRes] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("employees").select("*"),
      supabase.from("tp_docs").select("*"),
    ]);
    users = usersRes.data || [];
    clients = clientsRes.data || [];
    employees = employeesRes.data || [];
    tpDocs = tpDocsRes.data || [];
  } else {
    // Standard user: show only assigned data

    // Get assigned employees via employee_users
    const { data: employeeLinks } = await supabase
      .from("employee_users")
      .select("employee_id")
      .eq("user_id", user.id);

    const employeeIds = employeeLinks?.map((link) => link.employee_id) || [];

    if (employeeIds.length) {
      const [employeeRes, tpRes] = await Promise.all([
        supabase
          .from("employees")
          .select("*")
          .in("id", employeeIds),
        supabase
          .from("tp_docs")
          .select("*")
          .in("employee_id", employeeIds),
      ]);

      employees = employeeRes.data || [];
      tpDocs = tpRes.data || [];

      // Get clients tied to those employees
      const clientIds = [
        ...new Set(employees.map((e) => e.client_id).filter(Boolean)),
      ] as string[];

      if (clientIds.length) {
        const { data: clientRes } = await supabase
          .from("clients")
          .select("*")
          .in("id", clientIds);
        clients = clientRes || [];
      }
    }
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const newTPs =
    tpDocs.filter((d) => d.created_at?.startsWith(thisMonth)).length || 0;
  const newEmployees =
    employees.filter((e) => e.created_at?.startsWith(thisMonth)).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overzicht van uw gegevens</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {profile.role === "admin" && (
          <StatCard title="Total Gebruikers" value={users.length} />
        )}
        <StatCard title="Werkgevers" value={clients.length} />
        <StatCard title="Werknemers" value={employees.length} />
        <StatCard title="TP Documenten" value={tpDocs.length} />
        <StatCard title="TPs deze maand" value={newTPs} />
        <StatCard title="Nieuwe werknemers deze maand" value={newEmployees} />
      </div>
    </div>
  );
}
