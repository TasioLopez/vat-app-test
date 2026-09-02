import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin as checkIsAdmin, type AppRole } from "@/lib/auth/roles";

export type UserRole = AppRole | string;

export async function getSessionUserWithRole(): Promise<{
  userId: string;
  email: string | undefined;
  role: UserRole;
} | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email,
    role: (row?.role as UserRole) || "user",
  };
}

export function isAdmin(role: string): boolean {
  return checkIsAdmin(role);
}

export {
  canManageClients,
  canDeleteClients,
  canAssignEmployeeOwner,
  canOpenEmployeeDossier,
  isBackOffice,
  isStandardUser,
  roleLabel,
} from "@/lib/auth/roles";
export type { AppRole } from "@/lib/auth/roles";
