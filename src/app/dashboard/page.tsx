import type { Metadata } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Building2, ChevronRight, FileText, FileUser } from 'lucide-react';
import {
  canOpenEmployeeDossier,
  canViewOverallDashboardStats,
} from '@/lib/auth/roles';
import {
  getDashboardStats,
  resolveDashboardScope,
} from '@/lib/dashboard/stats';
import DashboardScopeToggle from './DashboardScopeToggle';
import { PAGE_SHELL_CLASS, PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from '@/lib/ui/page-chrome';

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
    return <div className="p-6 text-error-600">Niet geautoriseerd</div>;
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return <div className="p-6 text-error-600">Gebruikersprofiel niet gevonden.</div>;
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

  const clientsLabel = scope === 'mine' ? 'Mijn werkgevers' : 'Werkgevers';
  const subtitle =
    scope === 'mine' ? 'Ga verder waar je gebleven was' : 'Organisatiebreed overzicht';

  return (
    <div className={PAGE_SHELL_CLASS}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Dashboard</h1>
          <p className={PAGE_SUBTITLE_CLASS}>{subtitle}</p>
        </div>
        {showScopeToggle && <DashboardScopeToggle scope={scope} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title={clientsLabel} value={stats.clientsCount} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Werknemers" value={stats.employeesCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="TP-concepten" value={stats.tpDraftsCount} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Zonder TP" value={stats.employeesWithoutTp} />
        <StatCard title="CV-documenten" value={stats.cvDocumentsCount} icon={<FileUser className="h-5 w-5" />} />
        <StatCard title="Actieve CV-shares" value={stats.cvActiveSharesCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-50)]">
                <Users className="h-4 w-4 text-[var(--color-primary-500)]" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Verder werken — werknemers
                </CardTitle>
                <p className="mt-0.5 text-sm text-gray-500">Recent geopend</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {last5Employees.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Geen werknemers beschikbaar
              </div>
            ) : (
              <div className="space-y-2">
                {last5Employees.map((employee) => {
                  const content = (
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-gray-500">
                          {employee.email}
                        </p>
                      </div>
                      <ChevronRight className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400" />
                    </div>
                  );

                  if (!canOpenDossier) {
                    return <div key={employee.id}>{content}</div>;
                  }

                  return (
                    <Link
                      key={employee.id}
                      href={`/dashboard/employees/${employee.id}`}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-50)]">
                <Building2 className="h-4 w-4 text-[var(--color-primary-500)]" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Verder werken — werkgevers
                </CardTitle>
                <p className="mt-0.5 text-sm text-gray-500">Recent geopend</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {last5Clients.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Geen werkgevers beschikbaar
              </div>
            ) : (
              <div className="space-y-2">
                {last5Clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900">{client.name}</h3>
                        {client.industry && (
                          <p className="mt-0.5 text-sm text-gray-500">{client.industry}</p>
                        )}
                      </div>
                      <ChevronRight className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400" />
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
