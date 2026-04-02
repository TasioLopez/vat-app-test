export type HelpLocale = "en" | "nl";

export const EMBEDDING_MODEL = "text-embedding-3-small" as const;
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL = "gpt-4o" as const;

export const HELP_ARTICLE_PATH = "/dashboard/help";

export function articleHref(locale: HelpLocale, slug: string) {
  return `${HELP_ARTICLE_PATH}/${locale}/a/${encodeURIComponent(slug)}`;
}
