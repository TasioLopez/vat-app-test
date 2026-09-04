import type { Metadata } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Building2, ChevronRight } from 'lucide-react';
import {
  canOpenEmployeeDossier,
  canViewOverallDashboardStats,
} from '@/lib/auth/roles';
import {
  getDashboardStats,
  resolveDashboardScope,
} from '@/lib/dashboard/stats';
import DashboardScopeToggle from './DashboardScopeToggle';

export const metadata: Metadata = {
  title: 'Dashboard',
};

type SearchParams = { scope?: string };

type RecentEmployee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string | null;
};

type RecentClient = {
  id: string;
  name: string | null;
  industry: string | null;
  contact_email: string | null;
  created_at: string | null;
};

function sortByIdOrder<T extends { id: string }>(rows: T[], order: string[]): T[] {
  return [...rows].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export default async function DashboardPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-error-600 p-6">Unauthorized</div>;
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return <div className="text-error-600 p-6">User profile not found.</div>;
  }

  const role = profile.role;
  const scope = resolveDashboardScope(role, searchParams.scope);
  const showScopeToggle = canViewOverallDashboardStats(role);
  const canOpenDossier = canOpenEmployeeDossier(role);

  const stats = await getDashboardStats({
    supabase,
    userId: user.id,
    role,
    scope,
  });

  const [{ data: recentEmployeeActivity }, { data: recentClientActivity }] =
    await Promise.all([
      supabase
        .from('user_entity_activity')
        .select('entity_id, last_modified_at, last_accessed_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'employee')
        .order('last_modified_at', { ascending: false, nullsFirst: false })
        .order('last_accessed_at', { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from('user_entity_activity')
        .select('entity_id, last_modified_at, last_accessed_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'client')
        .order('last_modified_at', { ascending: false, nullsFirst: false })
        .order('last_accessed_at', { ascending: false, nullsFirst: false })
        .limit(5),
    ]);

  const recentEmployeeIds = (recentEmployeeActivity ?? [])
    .map((a) => a.entity_id)
    .filter(Boolean) as string[];
  const recentClientIds = (recentClientActivity ?? [])
    .map((a) => a.entity_id)
    .filter(Boolean) as string[];

  let last5Employees: RecentEmployee[] = [];
  if (recentEmployeeIds.length > 0) {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, created_at')
      .in('id', recentEmployeeIds);
    last5Employees = sortByIdOrder(data ?? [], recentEmployeeIds);
  } else {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    last5Employees = data ?? [];
  }

  let last5Clients: RecentClient[] = [];
  if (recentClientIds.length > 0) {
    const { data } = await supabase
      .from('clients')
      .select('id, name, industry, contact_email, created_at')
      .in('id', recentClientIds);
    last5Clients = sortByIdOrder(data ?? [], recentClientIds);
  } else {
    const { data } = await supabase
      .from('clients')
      .select('id, name, industry, contact_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    last5Clients = data ?? [];
  }

  const clientsLabel = scope === 'mine' ? 'Werkgevers toegewezen' : 'Werkgevers';
  const subtitle =
    scope === 'mine' ? 'Persoonlijk overzicht' : 'Organisatiebreed overzicht';

  return (
    <div className="space-y-8 bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-lg text-gray-600">{subtitle}</p>
        </div>
        {showScopeToggle && <DashboardScopeToggle scope={scope} />}
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {stats.totalUsers !== null && (
          <StatCard title="Totaal gebruikers" value={stats.totalUsers} />
        )}
        <StatCard title={clientsLabel} value={stats.clientsCount} />
        <StatCard title="Werknemers" value={stats.employeesCount} />
        <StatCard title="TP Documenten" value={stats.tpDocumentsCount} />
        <StatCard title="TPs deze maand" value={stats.tpDocumentsThisMonth} />
        <StatCard
          title="Nieuwe werknemers deze maand"
          value={stats.newEmployeesThisMonth}
        />
        <StatCard title="TP concepten" value={stats.tpDraftsCount} />
        <StatCard title="Werknemers zonder TP" value={stats.employeesWithoutTp} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-xl hover:shadow-purple-500/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Laatste 5 Werknemers
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-500">Meest recent geopend</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {last5Employees.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>Geen werknemers beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {last5Employees.map((employee) => {
                  const content = (
                    <div className="flex cursor-pointer items-center justify-between rounded-lg border border-purple-100 bg-white p-4 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-purple-700">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="mt-1 truncate text-sm text-gray-500">
                          {employee.email}
                        </p>
                        {employee.created_at && (
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(employee.created_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="ml-4 h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-purple-600" />
                    </div>
                  );

                  if (!canOpenDossier) {
                    return (
                      <div key={employee.id} className="group">
                        {content}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={employee.id}
                      href={`/dashboard/employees/${employee.id}`}
                      className="group block"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-xl hover:shadow-purple-500/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Laatste 5 Werkgevers
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-500">Meest recent geopend</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {last5Clients.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>Geen werkgevers beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {last5Clients.map((client) => (
                  <Link
                    key={client.id}
                    href="/dashboard/clients"
                    className="group block"
                  >
                    <div className="flex cursor-pointer items-center justify-between rounded-lg border border-purple-100 bg-white p-4 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-purple-700">
                          {client.name}
                        </h3>
                        {client.industry && (
                          <p className="mt-1 text-sm text-gray-500">{client.industry}</p>
                        )}
                        {client.contact_email && (
                          <p className="mt-1 truncate text-sm text-gray-500">
                            {client.contact_email}
                          </p>
                        )}
                        {client.created_at && (
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(client.created_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="ml-4 h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-purple-600" />
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
