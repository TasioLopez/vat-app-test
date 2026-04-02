import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import { articleWriteSchema } from "@/lib/help/schemas";
import { reindexArticle } from "@/lib/help/reindex";

export async function GET(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;

  const supabase = await getSupabaseServerClient();
  let q = supabase
    .from("kb_articles")
    .select("id, translation_group_id, locale, category_id, title, slug, excerpt, published, updated_at")
    .order("updated_at", { ascending: false });

  if (locale) q = q.eq("locale", locale);
  if (categoryId) q = q.eq("category_id", categoryId);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = articleWriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const translationGroupId = parsed.data.translationGroupId ?? randomUUID();
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("kb_articles")
    .insert({
      translation_group_id: translationGroupId,
      locale: parsed.data.locale,
      category_id: parsed.data.categoryId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      body: parsed.data.body,
      excerpt: parsed.data.excerpt ?? null,
      published: parsed.data.published ?? true,
      published_at: parsed.data.published ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await reindexArticle(data.id);
  } catch (e) {
    console.error("reindex after create", e);
  }

  return NextResponse.json({ id: data.id, translationGroupId });
}
