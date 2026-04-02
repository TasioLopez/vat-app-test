import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import { adminTicketPatchSchema } from "@/lib/help/schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminTicketPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("support_tickets")
    .select("first_admin_touch_at")
    .eq("id", id)
    .maybeSingle();

  const patch: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "resolved" || parsed.data.status === "closed") {
      patch.resolved_at = new Date().toISOString();
    }
  }
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.assigneeId !== undefined) patch.assignee_id = parsed.data.assigneeId;
  if (parsed.data.closedReason !== undefined) patch.closed_reason = parsed.data.closedReason;
  if (parsed.data.internalNotes !== undefined) patch.internal_notes = parsed.data.internalNotes;

  if (existing && !existing.first_admin_touch_at) {
    patch.first_admin_touch_at = new Date().toISOString();
  }

  const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
