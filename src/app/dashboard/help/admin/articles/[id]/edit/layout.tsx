import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Artikel bewerken (${id})`,
  };
}

export default function HelpAdminEditArticleLayout({ children }: { children: ReactNode }) {
  return children;
}
