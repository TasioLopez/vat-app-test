import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";
import { chunkMarkdown } from "./chunking";

const embedModel = "text-embedding-3-small" as const;
const BATCH = 16;

export async function reindexArticle(articleId: string): Promise<void> {
  const { data: article, error: aErr } = await supabaseAdmin
    .from("kb_articles")
    .select("id, body, published")
    .eq("id", articleId)
    .single();

  if (aErr || !article) {
    throw new Error(aErr?.message || "Article not found");
  }

  await supabaseAdmin.from("kb_article_chunks").delete().eq("article_id", articleId);

  if (!article.published) return;

  const chunks = chunkMarkdown(article.body || "");
  if (chunks.length === 0) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const res = await openai.embeddings.create({
      model: embedModel,
      input: batch,
    });
    const ordered = res.data.sort((a, b) => a.index - b.index);
    for (const d of ordered) {
      allEmbeddings.push(d.embedding as number[]);
    }
  }

  const insertRows = chunks.map((content, idx) => ({
    article_id: articleId,
    chunk_index: idx,
    content,
    embedding: allEmbeddings[idx] as unknown as string,
  }));

  const { error: insErr } = await supabaseAdmin.from("kb_article_chunks").insert(insertRows as never);

  if (insErr) {
    console.error("insert chunks", insErr);
    throw new Error(insErr.message);
  }
}
