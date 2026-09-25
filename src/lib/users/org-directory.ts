import type { SupabaseClient } from '@supabase/supabase-js';

export type OrgDirectoryUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string | null;
};

export function formatOrgUserDisplayName(
  user: Pick<OrgDirectoryUser, 'first_name' | 'last_name' | 'email'>
): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || 'Naamloos';
}

export function compareOrgUserDisplayName(
  a: Pick<OrgDirectoryUser, 'first_name' | 'last_name' | 'email'>,
  b: Pick<OrgDirectoryUser, 'first_name' | 'last_name' | 'email'>
): number {
  return formatOrgUserDisplayName(a).localeCompare(formatOrgUserDisplayName(b), 'nl', {
    sensitivity: 'base',
  });
}

export async function fetchOrgDirectory(
  supabase: SupabaseClient
): Promise<OrgDirectoryUser[]> {
  const { data, error } = await supabase.rpc('list_org_users');
  if (error) {
    console.error('list_org_users failed:', error);
    return [];
  }
  return [...((data ?? []) as OrgDirectoryUser[])].sort(compareOrgUserDisplayName);
}

export function orgUsersById(users: OrgDirectoryUser[]): Map<string, OrgDirectoryUser> {
  return new Map(users.map((u) => [u.id, u]));
}
