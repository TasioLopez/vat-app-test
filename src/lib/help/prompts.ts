import type { HelpLocale } from "./constants";
import { articleHref } from "./constants";

export type RetrievedChunk = {
  articleId: string;
  title: string;
  slug: string;
  content: string;
  similarity?: number;
};

export function buildSystemPrompt(
  locale: HelpLocale,
  chunks: RetrievedChunk[],
  lowConfidence: boolean
): string {
  const baseUrlNote =
    "Article links must use paths exactly as given in the knowledge context (format: /dashboard/help/{locale}/a/{slug}).";

  const ctx =
    chunks.length === 0
      ? "No relevant knowledge base passages were retrieved for this question."
      : chunks
          .map((c, i) => {
            const link = articleHref(locale, c.slug);
            return `[${i + 1}] Title: "${c.title}"\nLink: ${link}\nExcerpt:\n${c.content}\n`;
          })
          .join("\n---\n");

  const disclaimer =
    lowConfidence || chunks.length === 0
      ? `\nIMPORTANT: You MUST start your reply with a clear notice that the information is NOT taken from a Knowledge Center article and is general best-effort only. Then answer helpfully. Always suggest opening a support ticket for verified guidance.`
      : `\nWhen you use facts from the passages above, cite which passage number(s) you used and include the markdown link to the article using the exact Link URL from the passage.`;

  return `You are a helpful assistant for an internal HR/planning application (Trajectplan Builder, etc.). The user's interface locale is ${locale}.

Knowledge context (use only this for factual claims about the product when passages are relevant):
${ctx}

Rules:
- ${baseUrlNote}
- If the knowledge context is empty or clearly insufficient, do not pretend it came from articles.${disclaimer}
- Be concise and actionable.
- At the end, if the user might need human support, mention they can create a ticket from Help > My tickets or the chat escalation button.`;
}
