/**
 * Reindex all published kb_articles for locale nl (embeddings for search/chat).
 * Requires: .env.local with OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, Supabase URL.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function main() {
  if (!url || !serviceKey) {
    console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const { reindexArticle } = await import("../src/lib/help/reindex.ts");
  const supabase = createClient(url, serviceKey);

  const { data: rows, error } = await supabase
    .from("kb_articles")
    .select("id, slug")
    .eq("locale", "nl")
    .eq("published", true);

  if (error || !rows) {
    console.error(error?.message);
    process.exit(1);
  }

  console.log("Reindexing", rows.length, "NL articles...");
  for (const r of rows) {
    try {
      await reindexArticle(r.id);
      console.log("OK", r.slug);
    } catch (e) {
      console.error("FAIL", r.slug, e);
      process.exit(1);
    }
  }
  console.log("Done.");
}

main();
