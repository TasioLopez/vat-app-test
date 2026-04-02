import { redirect } from "next/navigation";

/** Legacy URLs: /dashboard/help/en/a/slug → /dashboard/help/a/slug */
export default async function LegacyHelpArticleRedirect({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/dashboard/help/a/${encodeURIComponent(slug)}`);
}
