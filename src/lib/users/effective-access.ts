/** Roles with unrestricted werkgever/werknemer access in the Gebruikers UI. */
export function hasUnrestrictedOrgAccess(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'back_office';
}

export type AccessEmployee = {
  id: string;
  client_id: string | null;
  owner_id: string | null;
};

/**
 * Effective werknemer ids per user: explicit `employee_users` ∪ owned (`owner_id`).
 * Effective werkgever ids per user: explicit `user_clients` ∪ client_id of those werknemers.
 * Matches RLS helpers `user_has_employee_access` / `user_has_client_access`.
 */
export function buildEffectiveAccessMaps(input: {
  employees: AccessEmployee[];
  userClients: Record<string, string[]>;
  userEmployees: Record<string, string[]>;
}): {
  effectiveEmployees: Record<string, string[]>;
  effectiveClients: Record<string, string[]>;
} {
  const employeeById = new Map(input.employees.map((e) => [e.id, e]));
  const ownedByUser = new Map<string, string[]>();

  for (const emp of input.employees) {
    if (!emp.owner_id) continue;
    const list = ownedByUser.get(emp.owner_id);
    if (list) list.push(emp.id);
    else ownedByUser.set(emp.owner_id, [emp.id]);
  }

  const userIds = new Set<string>([
    ...Object.keys(input.userClients),
    ...Object.keys(input.userEmployees),
    ...ownedByUser.keys(),
  ]);

  const effectiveEmployees: Record<string, string[]> = {};
  const effectiveClients: Record<string, string[]> = {};

  for (const userId of userIds) {
    const empIds = new Set<string>([
      ...(input.userEmployees[userId] || []),
      ...(ownedByUser.get(userId) || []),
    ]);
    effectiveEmployees[userId] = Array.from(empIds);

    const clientIds = new Set<string>(input.userClients[userId] || []);
    for (const empId of empIds) {
      const clientId = employeeById.get(empId)?.client_id;
      if (clientId) clientIds.add(clientId);
    }
    effectiveClients[userId] = Array.from(clientIds);
  }

  return { effectiveEmployees, effectiveClients };
}

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/** Paginate PostgREST selects past the default ~1000-row cap. */
export async function fetchAllPaged<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
