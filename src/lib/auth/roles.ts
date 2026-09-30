export type AppRole = 'admin' | 'user' | 'back_office';

export function isAdmin(role: string): boolean {
  return role === 'admin';
}

export function isBackOffice(role: string): boolean {
  return role === 'back_office';
}

/** Create werkgevers — admin and back office (back office's main extra vs normal users). */
export function canManageClients(role: string): boolean {
  return isAdmin(role) || isBackOffice(role);
}

export function canDeleteClients(role: string): boolean {
  return isAdmin(role);
}

export function canAssignEmployeeOwner(role: string): boolean {
  return isAdmin(role) || isBackOffice(role);
}

/** Back office may list employees but must not open dossiers. */
export function canOpenEmployeeDossier(role: string): boolean {
  return !isBackOffice(role);
}

export function isStandardUser(role: string): boolean {
  return role === 'user' || role === 'back_office';
}

/** Org-wide dashboard stats toggle — admin only. */
export function canViewOverallDashboardStats(role: string): boolean {
  return isAdmin(role);
}

/** Total users card — admin only. */
export function canViewTotalUsersStat(role: string): boolean {
  return isAdmin(role);
}

/** Gebruikers admin page — admin only. */
export function canAccessUsersAdmin(role: string): boolean {
  return isAdmin(role);
}

export function canInviteUsers(role: string): boolean {
  return isAdmin(role);
}

export function canDeleteUsers(role: string): boolean {
  return isAdmin(role);
}

/**
 * Whether actor may set target's role from → to.
 * Same-role is always allowed (no-op on save).
 * Only admins may change roles.
 */
export function canChangeUserRole(
  actorRole: string,
  _actorId: string,
  _targetId: string,
  fromRole: string,
  toRole: string
): boolean {
  if (fromRole === toRole) return true;
  return isAdmin(actorRole);
}

/** Role values the actor may pick for the target in the UI (always includes current). */
export function allowedRoleOptions(
  actorRole: string,
  actorId: string,
  targetId: string,
  fromRole: string
): AppRole[] {
  const candidates: AppRole[] = ['admin', 'back_office', 'user'];
  return candidates.filter((toRole) =>
    canChangeUserRole(actorRole, actorId, targetId, fromRole, toRole)
  );
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Beheerder';
    case 'back_office':
      return 'Back office';
    case 'user':
      return 'Gebruiker';
    default:
      return role;
  }
}
