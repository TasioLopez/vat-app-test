import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { canManageClients } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Nieuwe opdrachtgever",
};

export default async function NewClientLayout({ children }: { children: ReactNode }) {
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

  if (!row?.role || !canManageClients(row.role)) {
    redirect("/dashboard/clients");
  }

  return children;
}
