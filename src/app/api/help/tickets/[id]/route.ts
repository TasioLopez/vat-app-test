import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, description, status, priority, created_at, updated_at, resolved_at, escalation_chat_transcript, category_id, requester_id, internal_notes, assignee_id, closed_reason"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages, error: mErr } = await supabase
    .from("support_ticket_messages")
    .select("id, body, is_internal, created_at, author_id")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const { data: cat } = await supabase
    .from("support_ticket_categories")
    .select("slug, label_en, label_nl")
    .eq("id", ticket.category_id)
    .maybeSingle();

  if (!isAdmin(session.role)) {
    const { internal_notes: _in, ...safeTicket } = ticket;
    return NextResponse.json({
      ticket: { ...safeTicket, category: cat },
      messages: messages ?? [],
    });
  }

  return NextResponse.json({
    ticket: { ...ticket, category: cat },
    messages: messages ?? [],
  });
}
