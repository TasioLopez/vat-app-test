"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaBook, FaComments, FaSearch, FaTicketAlt } from "react-icons/fa";
import { articleHref, type HelpLocale } from "@/lib/help/constants";

type Category = {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  tool_key: string | null;
};

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category_id: string;
};

export default function HelpHubPage() {
  const [locale, setLocale] = useState<HelpLocale>("en");
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; title: string; slug: string; headline: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetch("/api/help/categories"),
        fetch(`/api/help/articles?locale=${locale}`),
      ]);
      const cj = await cRes.json();
      const aj = await aRes.json();
      setCategories(cj.categories || []);
      setArticles(aj.articles || []);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const res = await fetch(
        `/api/help/search?locale=${locale}&q=${encodeURIComponent(q.trim())}`
      );
      const j = await res.json();
      setSearchResults(j.results || []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, locale]);

  const tree = useMemo(() => {
    const roots = categories.filter((c) => !c.parent_id);
    const childrenOf = (pid: string) =>
      categories.filter((c) => c.parent_id === pid).sort((a, b) => a.sort_order - b.sort_order);
    return { roots, childrenOf };
  }, [categories]);

  const articlesByCategory = useMemo(() => {
    const m = new Map<string, ArticleRow[]>();
    for (const a of articles) {
      const list = m.get(a.category_id) || [];
      list.push(a);
      m.set(a.category_id, list);
    }
    return m;
  }, [articles]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Help & Knowledge Center</h1>
            <p className="text-gray-600 mt-1">Search articles, browse by topic, or ask the assistant.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                locale === "en"
                  ? "bg-purple-700 text-white"
                  : "bg-white text-gray-700 border border-purple-200"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale("nl")}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                locale === "nl"
                  ? "bg-purple-700 text-white"
                  : "bg-white text-gray-700 border border-purple-200"
              }`}
            >
              Nederlands
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/help/chat"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold shadow-lg shadow-purple-500/25"
          >
            <FaComments /> Ask assistant
          </Link>
          <Link
            href="/dashboard/help/tickets"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border-2 border-purple-200 text-purple-800 font-semibold"
          >
            <FaTicketAlt /> My tickets
          </Link>
        </div>

        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the knowledge base…"
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none bg-white shadow-sm text-lg"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Search results</h2>
            <ul className="space-y-2">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <Link
                    href={articleHref(locale, r.slug)}
                    className="block p-3 rounded-xl hover:bg-purple-50 border border-transparent hover:border-purple-100"
                  >
                    <span className="font-medium text-purple-800">{r.title}</span>
                    {r.headline ? (
                      <p
                        className="text-sm text-gray-600 mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: r.headline }}
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaBook className="text-purple-600" /> Browse
            </h2>
            {tree.roots.sort((a, b) => a.sort_order - b.sort_order).map((root) => (
              <section
                key={root.id}
                className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                  <h3 className="text-lg font-bold text-gray-900">{root.title}</h3>
                  {root.description ? (
                    <p className="text-sm text-gray-600 mt-1">{root.description}</p>
                  ) : null}
                </div>
                <div className="p-6 space-y-6">
                  {tree.childrenOf(root.id).map((sub) => (
                    <div key={sub.id}>
                      <h4 className="font-semibold text-purple-800 mb-2">{sub.title}</h4>
                      <ul className="space-y-1">
                        {(articlesByCategory.get(sub.id) || []).map((a) => (
                          <li key={a.id}>
                            <Link
                              href={articleHref(locale, a.slug)}
                              className="text-purple-700 hover:underline"
                            >
                              {a.title}
                            </Link>
                          </li>
                        ))}
                        {(articlesByCategory.get(sub.id) || []).length === 0 ? (
                          <li className="text-sm text-gray-400">No articles yet.</li>
                        ) : null}
                      </ul>
                    </div>
                  ))}
                  {(articlesByCategory.get(root.id) || []).length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">General</h4>
                      <ul className="space-y-1">
                        {(articlesByCategory.get(root.id) || []).map((a) => (
                          <li key={a.id}>
                            <Link
                              href={articleHref(locale, a.slug)}
                              className="text-purple-700 hover:underline"
                            >
                              {a.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
