"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaArrowLeft, FaLanguage } from "react-icons/fa";
import { ArticleBody } from "@/components/help/ArticleBody";
import { articleHref, type HelpLocale } from "@/lib/help/constants";

export default function HelpArticlePage() {
  const params = useParams();
  const locale = (params.locale as string) as HelpLocale;
  const slug = decodeURIComponent(params.slug as string);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sibling, setSibling] = useState<{ locale: string; slug: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/help/articles/${encodeURIComponent(slug)}?locale=${locale}`
        );
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setErr(j.error || "Not found");
          return;
        }
        setTitle(j.article.title);
        setBody(j.article.body);
        setSibling(j.siblingArticle);
      } catch {
        if (!cancelled) setErr("Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, slug]);

  if (err) {
    return (
      <div className="p-10">
        <p className="text-red-600">{err}</p>
        <Link href="/dashboard/help" className="text-purple-700 underline mt-4 inline-block">
          Back to Help
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-2 text-purple-700 font-medium mb-6 hover:underline"
        >
          <FaArrowLeft /> Back to Help
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{title || "…"}</h1>
          {sibling ? (
            <Link
              href={articleHref(sibling.locale as HelpLocale, sibling.slug)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-purple-200 text-purple-800 text-sm font-medium"
            >
              <FaLanguage /> {sibling.locale === "nl" ? "Nederlands" : "English"}
            </Link>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-8">
          <ArticleBody markdown={body} />
        </div>
      </div>
    </div>
  );
}
