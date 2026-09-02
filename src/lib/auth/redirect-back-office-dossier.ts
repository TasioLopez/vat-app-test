import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { canOpenEmployeeDossier } from "@/lib/auth/roles";

/**
 * Redirects back_office users away from werknemer dossier routes
 * (detail, TP, CV, VGR, new employee).
 */
export async function redirectIfBackOfficeBlockedFromDossier(
  fallbackPath = "/dashboard/employees"
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: row } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!row?.role || !canOpenEmployeeDossier(row.role)) {
    redirect(fallbackPath);
  }
}
