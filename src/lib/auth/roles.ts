export type AppRole = 'admin' | 'user' | 'back_office';

export function isAdmin(role: string): boolean {
  return role === 'admin';
}

export function isBackOffice(role: string): boolean {
  return role === 'back_office';
}

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
