import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";
import { getSessionUserWithRole } from "@/lib/help/auth";
import { localeSchema } from "@/lib/help/schemas";

export async function GET(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const localeParsed = localeSchema.safeParse(searchParams.get("locale") || "nl");
  const locale = localeParsed.success ? localeParsed.data : "nl";

  const { data, error } = await supabaseAdmin.rpc("search_kb_articles", {
    search_query: q,
    filter_locale: locale,
    result_limit: 20,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as {
    article_id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    headline: string;
  }[];

  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.article_id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      headline: r.headline,
    })),
  });
}
