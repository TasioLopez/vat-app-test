import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";
import type { HelpLocale } from "./constants";
import type { RetrievedChunk } from "./prompts";

const embedModel = "text-embedding-3-small" as const;
const VECTOR_K = 8;
const FTS_K = 5;

export async function retrieveContext(
  query: string,
  locale: HelpLocale
): Promise<{ chunks: RetrievedChunk[]; lowConfidence: boolean }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const q = (query || "").trim();
  if (!q) {
    return { chunks: [], lowConfidence: true };
  }

  const embRes = await openai.embeddings.create({
    model: embedModel,
    input: q,
  });
  const queryEmbedding = embRes.data[0].embedding as number[];

  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const { data: vecRows, error: vecErr } = await supabaseAdmin.rpc("match_kb_chunks", {
    query_embedding: vectorLiteral,
    match_count: VECTOR_K,
    filter_locale: locale,
  });

  if (vecErr) {
    console.error("match_kb_chunks", vecErr);
  }

  const { data: ftsRows, error: ftsErr } = await supabaseAdmin.rpc("search_kb_articles", {
    search_query: q,
    filter_locale: locale,
    result_limit: FTS_K,
  });

  if (ftsErr) {
    console.error("search_kb_articles", ftsErr);
  }

  const byArticle = new Map<string, RetrievedChunk>();

  const vecList = (vecRows || []) as {
    chunk_id: string;
    article_id: string;
    chunk_content: string;
    similarity: number;
  }[];

  const vecArticleIds = [...new Set(vecList.map((r) => r.article_id))];
  const { data: vecArticles } =
    vecArticleIds.length > 0
      ? await supabaseAdmin.from("kb_articles").select("id, title, slug").in("id", vecArticleIds)
      : { data: [] as { id: string; title: string; slug: string }[] };

  const artMap = new Map((vecArticles || []).map((a) => [a.id, a]));

  for (const row of vecList) {
    const art = artMap.get(row.article_id);
    if (!art) continue;
    const key = art.id;
    const prev = byArticle.get(key);
    const sim = row.similarity ?? 0;
    if (!prev || sim > (prev.similarity ?? 0)) {
      byArticle.set(key, {
        articleId: art.id,
        title: art.title,
        slug: art.slug,
        content: row.chunk_content,
        similarity: sim,
      });
    }
  }

  const ftsList = (ftsRows || []) as {
    article_id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    headline: string;
  }[];

  for (const row of ftsList) {
    if (!byArticle.has(row.article_id)) {
      byArticle.set(row.article_id, {
        articleId: row.article_id,
        title: row.title,
        slug: row.slug,
        content: row.headline || row.excerpt || "",
        similarity: 0.35,
      });
    }
  }

  const chunks = [...byArticle.values()].sort(
    (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)
  );

  const top = chunks[0]?.similarity ?? 0;
  const lowConfidence = chunks.length === 0 || top < 0.28;

  return { chunks: chunks.slice(0, 6), lowConfidence };
}
