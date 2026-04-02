import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole } from "@/lib/help/auth";
import { localeSchema } from "@/lib/help/schemas";

export async function GET(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const localeParsed = localeSchema.safeParse(searchParams.get("locale") || "nl");
  const locale = localeParsed.success ? localeParsed.data : "nl";
  const categoryId = searchParams.get("categoryId");

  const supabase = await getSupabaseServerClient();
  let q = supabase
    .from("kb_articles")
    .select("id, translation_group_id, locale, category_id, title, slug, excerpt, published, updated_at")
    .eq("locale", locale)
    .order("title", { ascending: true });

  if (categoryId) {
    q = q.eq("category_id", categoryId);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data ?? [] });
}
