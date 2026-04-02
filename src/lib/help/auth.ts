import { getSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "admin" | string;

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
  return role === "admin";
}
