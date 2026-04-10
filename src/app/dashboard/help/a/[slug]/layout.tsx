import type { Metadata } from "next";
import type { ReactNode } from "react";

function titleFromSlug(slug: string) {
  const decoded = decodeURIComponent(slug).replace(/-/g, " ").trim();
  if (!decoded) return "Artikel";
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

export default function HelpArticleLayout({ children }: { children: ReactNode }) {
  return children;
}
