import type { SupabaseClient } from '@supabase/supabase-js';
import {
  canViewOverallDashboardStats,
  canViewTotalUsersStat,
  type AppRole,
} from '@/lib/auth/roles';

export type DashboardScope = 'mine' | 'all';

export type DashboardStats = {
  scope: DashboardScope;
  totalUsers: number | null;
  clientsCount: number;
  employeesCount: number;
  newEmployeesThisMonth: number;
  tpDocumentsCount: number;
  tpDocumentsThisMonth: number;
  tpDraftsCount: number;
  employeesWithoutTp: number;
  /** Advisor-owned CV docs only (`parent_cv_id` is null — excludes share child clones). */
  cvDocumentsCount: number;
  cvDocumentsThisMonth: number;
  /** Share links that are not revoked and not expired. */
  cvActiveSharesCount: number;
  cvSharesThisMonth: number;
};

/** Instant of local midnight in Europe/Amsterdam for the given calendar Y-M-D. */
function amsterdamMidnightUtc(year: number, month: number, day: number): Date {
  for (const offsetHours of [1, 2] as const) {
    const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - offsetHours * 60 * 60 * 1000;
    const d = new Date(utcMs);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value;
    if (
      Number(get('year')) === year &&
      Number(get('month')) === month &&
      Number(get('day')) === day &&
      get('hour') === '00' &&
      get('minute') === '00'
    ) {
      return d;
    }
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/** Current calendar month bounds in Europe/Amsterdam, as UTC ISO strings [start, end). */
export function getAmsterdamMonthRange(now = new Date()): {
  startIso: string;
  endIso: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    startIso: amsterdamMidnightUtc(year, month, 1).toISOString(),
    endIso: amsterdamMidnightUtc(nextYear, nextMonth, 1).toISOString(),
  };
}

export function resolveDashboardScope(
  role: string,
  requested?: string | null
): DashboardScope {
  if (!canViewOverallDashboardStats(role)) {
    return 'mine';
  }
  if (requested === 'mine' || requested === 'all') {
    return requested;
  }
  return 'all';
}

/** Owned (`owner_id`) + assigned (`employee_users`) employee ids for a user. */
export async function getMyEmployeeIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const [ownedRes, assignedRes] = await Promise.all([
    supabase.from('employees').select('id').eq('owner_id', userId),
    supabase.from('employee_users').select('employee_id').eq('user_id', userId),
  ]);

  const ids = new Set<string>();
  for (const row of ownedRes.data ?? []) {
    if (row.id) ids.add(row.id);
  }
  for (const row of assignedRes.data ?? []) {
    if (row.employee_id) ids.add(row.employee_id);
  }
  return Array.from(ids);
}

function countOrZero(count: number | null): number {
  return count ?? 0;
}

async function countEmployeesWithoutTp(
  supabase: SupabaseClient,
  employeeIds: string[] | null
): Promise<number> {
  // null = all employees visible under RLS
  let ids: string[];
  if (employeeIds === null) {
    const { data } = await supabase.from('employees').select('id');
    ids = (data ?? []).map((r) => r.id).filter(Boolean);
  } else {
    ids = employeeIds;
  }

  if (ids.length === 0) return 0;

  const { data: tpRows } = await supabase
    .from('documents')
    .select('employee_id')
    .eq('type', 'tp')
    .in('employee_id', ids);

  const withTp = new Set(
    (tpRows ?? []).map((r) => r.employee_id).filter((id): id is string => Boolean(id))
  );
  return ids.filter((id) => !withTp.has(id)).length;
}

function emptyCount(): Promise<{ count: number }> {
  return Promise.resolve({ count: 0 });
}

export async function getDashboardStats(opts: {
  supabase: SupabaseClient;
  userId: string;
  role: AppRole | string;
  scope: DashboardScope;
}): Promise<DashboardStats> {
  const { supabase, userId, role, scope } = opts;
  const { startIso, endIso } = getAmsterdamMonthRange();
  const nowIso = new Date().toISOString();

  if (scope === 'mine') {
    const myEmployeeIds = await getMyEmployeeIds(supabase, userId);
    const hasEmployees = myEmployeeIds.length > 0;

    const [
      clientsRes,
      newEmployeesRes,
      tpTotalRes,
      tpMonthRes,
      draftsRes,
      withoutTp,
      cvTotalRes,
      cvMonthRes,
      cvActiveSharesRes,
      cvSharesMonthRes,
    ] = await Promise.all([
      supabase
        .from('user_clients')
        .select('client_id', { count: 'exact', head: true })
        .eq('user_id', userId),
      hasEmployees
        ? supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .in('id', myEmployeeIds)
            .gte('created_at', startIso)
            .lt('created_at', endIso)
        : emptyCount(),
      hasEmployees
        ? supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'tp')
            .in('employee_id', myEmployeeIds)
        : emptyCount(),
      hasEmployees
        ? supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'tp')
            .in('employee_id', myEmployeeIds)
            .gte('uploaded_at', startIso)
            .lt('uploaded_at', endIso)
        : emptyCount(),
      hasEmployees
        ? supabase
            .from('tp_instances')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'draft')
            .in('employee_id', myEmployeeIds)
        : emptyCount(),
      countEmployeesWithoutTp(supabase, myEmployeeIds),
      hasEmployees
        ? supabase
            .from('cv_documents')
            .select('id', { count: 'exact', head: true })
            .is('parent_cv_id', null)
            .in('employee_id', myEmployeeIds)
        : emptyCount(),
      hasEmployees
        ? supabase
            .from('cv_documents')
            .select('id', { count: 'exact', head: true })
            .is('parent_cv_id', null)
            .in('employee_id', myEmployeeIds)
            .gte('created_at', startIso)
            .lt('created_at', endIso)
        : emptyCount(),
      hasEmployees
        ? supabase
            .from('cv_share_links')
            .select('id', { count: 'exact', head: true })
            .in('employee_id', myEmployeeIds)
            .is('revoked_at', null)
            .gt('expires_at', nowIso)
        : emptyCount(),
      hasEmployees
        ? supabase
            .from('cv_share_links')
            .select('id', { count: 'exact', head: true })
            .in('employee_id', myEmployeeIds)
            .gte('created_at', startIso)
            .lt('created_at', endIso)
        : emptyCount(),
    ]);

    return {
      scope,
      totalUsers: null,
      clientsCount: countOrZero(clientsRes.count),
      employeesCount: myEmployeeIds.length,
      newEmployeesThisMonth: countOrZero(newEmployeesRes.count),
      tpDocumentsCount: countOrZero(tpTotalRes.count),
      tpDocumentsThisMonth: countOrZero(tpMonthRes.count),
      tpDraftsCount: countOrZero(draftsRes.count),
      employeesWithoutTp: withoutTp,
      cvDocumentsCount: countOrZero(cvTotalRes.count),
      cvDocumentsThisMonth: countOrZero(cvMonthRes.count),
      cvActiveSharesCount: countOrZero(cvActiveSharesRes.count),
      cvSharesThisMonth: countOrZero(cvSharesMonthRes.count),
    };
  }

  // scope === 'all'
  const showTotalUsers = canViewTotalUsersStat(role);

  const [
    usersRes,
    clientsRes,
    employeesRes,
    newEmployeesRes,
    tpTotalRes,
    tpMonthRes,
    draftsRes,
    withoutTp,
    cvTotalRes,
    cvMonthRes,
    cvActiveSharesRes,
    cvSharesMonthRes,
  ] = await Promise.all([
    showTotalUsers
      ? supabase.from('users').select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: null as number | null }),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('employees').select('id', { count: 'exact', head: true }),
    supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'tp'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'tp')
      .gte('uploaded_at', startIso)
      .lt('uploaded_at', endIso),
    supabase
      .from('tp_instances')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft'),
    countEmployeesWithoutTp(supabase, null),
    supabase
      .from('cv_documents')
      .select('id', { count: 'exact', head: true })
      .is('parent_cv_id', null),
    supabase
      .from('cv_documents')
      .select('id', { count: 'exact', head: true })
      .is('parent_cv_id', null)
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    supabase
      .from('cv_share_links')
      .select('id', { count: 'exact', head: true })
      .is('revoked_at', null)
      .gt('expires_at', nowIso),
    supabase
      .from('cv_share_links')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lt('created_at', endIso),
  ]);

  return {
    scope,
    totalUsers: showTotalUsers ? countOrZero(usersRes.count) : null,
    clientsCount: countOrZero(clientsRes.count),
    employeesCount: countOrZero(employeesRes.count),
    newEmployeesThisMonth: countOrZero(newEmployeesRes.count),
    tpDocumentsCount: countOrZero(tpTotalRes.count),
    tpDocumentsThisMonth: countOrZero(tpMonthRes.count),
    tpDraftsCount: countOrZero(draftsRes.count),
    employeesWithoutTp: withoutTp,
    cvDocumentsCount: countOrZero(cvTotalRes.count),
    cvDocumentsThisMonth: countOrZero(cvMonthRes.count),
    cvActiveSharesCount: countOrZero(cvActiveSharesRes.count),
    cvSharesThisMonth: countOrZero(cvSharesMonthRes.count),
  };
}
