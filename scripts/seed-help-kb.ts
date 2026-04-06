/**
 * Upsert NL help articles from content/help/nl/*.md into kb_articles.
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 * Run DB migration first so kb_categories exist.
 *
 * Usage: npx tsx scripts/seed-help-kb.ts [--reindex]
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function parseHelpMd(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error("Missing YAML frontmatter (--- ... ---)");
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    meta[k] = v;
  }
  return { meta, body: m[2].trim() };
}

async function main() {
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const doReindex = process.argv.includes("--reindex");
  const { reindexArticle } = await import("../src/lib/help/reindex");

  const supabase = createClient(url, serviceKey);
  const dir = resolve(process.cwd(), "content/help/nl");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  const { data: cats, error: catErr } = await supabase.from("kb_categories").select("id, slug");
  if (catErr || !cats?.length) {
    console.error("Failed to load kb_categories:", catErr?.message);
    process.exit(1);
  }
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  for (const file of files) {
    const raw = readFileSync(resolve(dir, file), "utf8");
    let parsed: { meta: Record<string, string>; body: string };
    try {
      parsed = parseHelpMd(raw);
    } catch (e) {
      console.warn("Skip", file, e);
      continue;
    }
    const { meta, body } = parsed;
    const slug = meta.slug;
    const title = meta.title;
    const excerpt = meta.excerpt || null;
    const categorySlug = meta.category_slug;
    const translationGroupId = meta.translation_group_id;
    const locale = meta.locale || "nl";

    if (!slug || !title || !categorySlug || !translationGroupId) {
      console.warn("Skip", file, "incomplete frontmatter");
      continue;
    }

    const categoryId = catBySlug.get(categorySlug);
    if (!categoryId) {
      console.error("Unknown category_slug", categorySlug, "in", file);
      process.exit(1);
    }

    const { data: row, error: upErr } = await supabase
      .from("kb_articles")
      .upsert(
        {
          translation_group_id: translationGroupId,
          locale,
          category_id: categoryId,
          title,
          slug,
          body,
          excerpt,
          published: true,
          published_at: new Date().toISOString(),
        },
        { onConflict: "locale,slug" },
      )
      .select("id")
      .single();

    if (upErr || !row) {
      console.error("Upsert failed", slug, upErr?.message);
      process.exit(1);
    }

    console.log("Upserted", locale, slug, row.id);

    if (doReindex) {
      try {
        await reindexArticle(row.id);
        console.log("  reindexed", row.id);
      } catch (e) {
        console.error("  reindex failed", row.id, e);
        process.exit(1);
      }
    }
  }

  if (!doReindex) {
    console.log("\nDone. Run with --reindex or npm run help:reindex-all for embeddings.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
