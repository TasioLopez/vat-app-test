import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole } from "@/lib/help/auth";
import { ticketCreateSchema } from "@/lib/help/schemas";

export async function GET() {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, status, priority, created_at, updated_at, category_id")
    .eq("requester_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      requester_id: session.userId,
      category_id: parsed.data.categoryId,
      subject: parsed.data.subject,
      description: parsed.data.description ?? "",
      escalation_chat_transcript: parsed.data.escalationChatTranscript ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
