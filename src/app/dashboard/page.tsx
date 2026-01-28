import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Users, Building2, ChevronRight } from "lucide-react";

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

  // Get user's recent employee activity from employee_users
  const { data: recentEmployeeActivity } = await supabase
    .from("employee_users")
    .select("employee_id, last_modified_at, last_accessed_at")
    .eq("user_id", user.id)
    .order("last_modified_at", { ascending: false, nullsFirst: false })
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .limit(5);

  // Get user's recent client activity from user_clients
  const { data: recentClientActivity } = await supabase
    .from("user_clients")
    .select("client_id, last_modified_at, last_accessed_at")
    .eq("user_id", user.id)
    .order("last_modified_at", { ascending: false, nullsFirst: false })
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .limit(5);

  // Extract IDs and maintain order
  const recentEmployeeIds = recentEmployeeActivity
    ?.map(a => a.employee_id)
    .filter(Boolean) || [];

  const recentClientIds = recentClientActivity
    ?.map(a => a.client_id)
    .filter(Boolean) || [];

  // Get the actual records in the same order
  const last5Employees = recentEmployeeIds.length > 0
    ? employees
        .filter(e => recentEmployeeIds.includes(e.id))
        .sort((a, b) => {
          const aIndex = recentEmployeeIds.indexOf(a.id);
          const bIndex = recentEmployeeIds.indexOf(b.id);
          return aIndex - bIndex;
        })
    : employees
        .sort((a, b) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 5);

  const last5Clients = recentClientIds.length > 0
    ? clients
        .filter(c => recentClientIds.includes(c.id))
        .sort((a, b) => {
          const aIndex = recentClientIds.indexOf(a.id);
          const bIndex = recentClientIds.indexOf(b.id);
          return aIndex - bIndex;
        })
    : clients
        .sort((a, b) => {
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 5);

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-purple-50/30">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-lg text-gray-600">Overzicht van uw gegevens</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {profile.role === "admin" && (
          <StatCard title="Total Gebruikers" value={users.length} />
        )}
        <StatCard title="Werkgevers" value={clients.length} />
        <StatCard title="Werknemers" value={employees.length} />
        <StatCard title="TP Documenten" value={tpDocs.length} />
        <StatCard title="TPs deze maand" value={newTPs} />
        <StatCard title="Nieuwe werknemers deze maand" value={newEmployees} />
      </div>

      {/* Recent Items Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Last 5 Employees Card */}
        <Card className="hover:shadow-xl hover:shadow-purple-500/20 border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Laatste 5 Werknemers
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Meest recent geopend
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {last5Employees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Geen werknemers beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {last5Employees.map((employee) => (
                  <Link
                    key={employee.id}
                    href={`/dashboard/employees/${employee.id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border border-purple-100 bg-white hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {employee.email}
                        </p>
                        {employee.created_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(employee.created_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0 ml-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last 5 Clients Card */}
        <Card className="hover:shadow-xl hover:shadow-purple-500/20 border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Laatste 5 Werkgevers
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Meest recent geopend
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {last5Clients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Geen werkgevers beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {last5Clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border border-purple-100 bg-white hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {client.name}
                        </h3>
                        {client.industry && (
                          <p className="text-sm text-gray-500 mt-1">
                            {client.industry}
                          </p>
                        )}
                        {client.contact_email && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {client.contact_email}
                          </p>
                        )}
                        {client.created_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(client.created_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0 ml-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
