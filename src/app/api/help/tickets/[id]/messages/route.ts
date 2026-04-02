import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import { ticketMessageSchema } from "@/lib/help/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ticketMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.isInternal && !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getSupabaseServerClient();

  if (isAdmin(session.role)) {
    const { error: touchErr } = await supabase
      .from("support_tickets")
      .update({
        first_admin_touch_at: new Date().toISOString(),
        status: "in_progress",
      })
      .eq("id", ticketId)
      .is("first_admin_touch_at", null);

    if (touchErr) {
      console.warn("first_admin_touch_at", touchErr);
    }
  }

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      author_id: session.userId,
      body: parsed.data.body,
      is_internal: isAdmin(session.role) ? parsed.data.isInternal : false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
