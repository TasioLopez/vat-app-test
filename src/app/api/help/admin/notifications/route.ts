import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export async function GET() {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("help_unread_ticket_count_admin");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: data ?? 0 });
}
