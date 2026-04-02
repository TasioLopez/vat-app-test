import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole } from "@/lib/help/auth";
import { localeSchema } from "@/lib/help/schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const localeParsed = localeSchema.safeParse(searchParams.get("locale") || "nl");
  const locale = localeParsed.success ? localeParsed.data : "nl";

  const supabase = await getSupabaseServerClient();
  const { data: article, error } = await supabase
    .from("kb_articles")
    .select(
      "id, translation_group_id, locale, category_id, title, slug, body, excerpt, published, updated_at"
    )
    .eq("slug", decodeURIComponent(slug))
    .eq("locale", locale)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: sibling } = await supabase
    .from("kb_articles")
    .select("id, locale, slug")
    .eq("translation_group_id", article.translation_group_id)
    .neq("locale", locale)
    .maybeSingle();

  return NextResponse.json({ article, siblingArticle: sibling ?? null });
}
