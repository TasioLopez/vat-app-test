export type DeleteUserAssignment = {
  employeeId: string;
  ownerId: string;
};

export type ValidateDeleteUserAssignmentsResult =
  | { ok: true; assignments: DeleteUserAssignment[] }
  | { ok: false; error: string };

/**
 * Ensures every owned dossier is reassigned exactly once to a different user.
 * Used by the delete-user API (and unit tests) before calling the RPC.
 */
export function validateDeleteUserAssignments(opts: {
  fromUserId: string;
  ownedEmployeeIds: string[];
  assignments: DeleteUserAssignment[];
}): ValidateDeleteUserAssignmentsResult {
  const fromUserId = String(opts.fromUserId ?? "").trim();
  if (!fromUserId) {
    return { ok: false, error: "Gebruiker ontbreekt." };
  }

  const owned = [...new Set(opts.ownedEmployeeIds.map((id) => String(id).trim()).filter(Boolean))];
  const ownedSet = new Set(owned);

  if (opts.assignments.length !== owned.length) {
    return {
      ok: false,
      error: `Alle ${owned.length} dossiers moeten opnieuw worden toegewezen (${opts.assignments.length} toegewezen).`,
    };
  }

  const seenEmployees = new Set<string>();
  const normalized: DeleteUserAssignment[] = [];

  for (const raw of opts.assignments) {
    const employeeId = String(raw?.employeeId ?? "").trim();
    const ownerId = String(raw?.ownerId ?? "").trim();

    if (!employeeId || !ownerId) {
      return { ok: false, error: "Elke toewijzing heeft een werknemer en nieuwe eigenaar nodig." };
    }

    if (!ownedSet.has(employeeId)) {
      return { ok: false, error: "Toewijzing bevat een werknemer die niet van deze gebruiker is." };
    }

    if (seenEmployees.has(employeeId)) {
      return { ok: false, error: "Dubbele toewijzing voor dezelfde werknemer." };
    }

    if (ownerId === fromUserId) {
      return { ok: false, error: "Nieuwe eigenaar mag niet de te verwijderen gebruiker zijn." };
    }

    seenEmployees.add(employeeId);
    normalized.push({ employeeId, ownerId });
  }

  if (seenEmployees.size !== owned.length) {
    return { ok: false, error: "Niet alle dossiers zijn opnieuw toegewezen." };
  }

  return { ok: true, assignments: normalized };
}

/** Build assignment payload for the RPC (`employee_id` / `owner_id` keys). */
export function toRpcAssignments(
  assignments: DeleteUserAssignment[]
): { employee_id: string; owner_id: string }[] {
  return assignments.map((a) => ({
    employee_id: a.employeeId,
    owner_id: a.ownerId,
  }));
}

/** Count dossiers per new owner for the delete modal summary. */
export function summarizeOwnerAssignments(
  assignments: Record<string, string | null | undefined>
): { ownerId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ownerId of Object.values(assignments)) {
    if (!ownerId) continue;
    counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ownerId, count]) => ({ ownerId, count }))
    .sort((a, b) => b.count - a.count || a.ownerId.localeCompare(b.ownerId));
}

export function allEmployeesHaveNewOwner(
  employeeIds: string[],
  assignments: Record<string, string | null | undefined>,
  fromUserId: string
): boolean {
  if (employeeIds.length === 0) return true;
  return employeeIds.every((id) => {
    const ownerId = assignments[id];
    return !!ownerId && ownerId !== fromUserId;
  });
}
