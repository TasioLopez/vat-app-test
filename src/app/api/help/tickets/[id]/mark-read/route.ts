import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: ticket, error: tErr } = await supabase
    .from("support_tickets")
    .select("id, requester_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed =
    ticket.requester_id === session.userId || isAdmin(session.role);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("support_ticket_reads").upsert(
    {
      user_id: session.userId,
      ticket_id: ticketId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,ticket_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
