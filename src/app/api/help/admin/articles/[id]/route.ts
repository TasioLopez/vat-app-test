import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import { articleWriteSchema } from "@/lib/help/schemas";
import { reindexArticle } from "@/lib/help/reindex";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("kb_articles").select("*").eq("id", id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: siblings } = await supabase
    .from("kb_articles")
    .select("id, locale, slug")
    .eq("translation_group_id", data.translation_group_id);

  return NextResponse.json({ article: data, siblings: siblings ?? [] });
}

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

  const parsed = articleWriteSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.translationGroupId !== undefined) {
    patch.translation_group_id = parsed.data.translationGroupId;
  }
  if (parsed.data.locale !== undefined) patch.locale = parsed.data.locale;
  if (parsed.data.categoryId !== undefined) patch.category_id = parsed.data.categoryId;
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.slug !== undefined) patch.slug = parsed.data.slug;
  if (parsed.data.body !== undefined) patch.body = parsed.data.body;
  if (parsed.data.excerpt !== undefined) patch.excerpt = parsed.data.excerpt;
  if (parsed.data.published !== undefined) {
    patch.published = parsed.data.published;
    patch.published_at = parsed.data.published ? new Date().toISOString() : null;
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("kb_articles").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await reindexArticle(id);
  } catch (e) {
    console.error("reindex after patch", e);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("kb_articles").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
