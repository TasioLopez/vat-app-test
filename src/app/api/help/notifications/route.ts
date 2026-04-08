import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole } from "@/lib/help/auth";

export async function GET() {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: rows, error } = await supabase.rpc("help_unread_ticket_ids_requester");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ticketIds = (rows || []).map((r: { ticket_id: string }) => r.ticket_id);
  return NextResponse.json({ count: ticketIds.length, ticketIds });
}
