import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const supabase = await getSupabaseServerClient();
  let q = supabase
    .from("support_tickets")
    .select(
      "id, subject, status, priority, created_at, updated_at, resolved_at, category_id, requester_id, assignee_id, first_admin_touch_at"
    )
    .order("created_at", { ascending: false });

  if (status) {
    q = q.eq("status", status);
  }

  const { data: tickets, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requesterIds = [...new Set((tickets || []).map((t) => t.requester_id))];
  const { data: users } =
    requesterIds.length > 0
      ? await supabase.from("users").select("id, email, first_name, last_name").in("id", requesterIds)
      : { data: [] as { id: string; email: string; first_name: string | null; last_name: string | null }[] };

  const userMap = new Map((users || []).map((u) => [u.id, u]));

  return NextResponse.json({
    tickets: (tickets || []).map((t) => ({
      ...t,
      requester: userMap.get(t.requester_id) ?? null,
    })),
  });
}
