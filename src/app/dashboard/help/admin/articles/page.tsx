"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HELP_DEFAULT_LOCALE } from "@/lib/help/constants";

type Art = {
  id: string;
  title: string;
  slug: string;
  locale: string;
  published: boolean;
  updated_at: string;
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Art[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/help/admin/articles?locale=${HELP_DEFAULT_LOCALE}`);
    const j = await res.json();
    setArticles(j.articles || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Artikelen (Nederlands)</h1>
        <Link
          href="/dashboard/help/admin/articles/new"
          className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium"
        >
          Nieuw artikel
        </Link>
      </div>
      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.id}>
            <Link
              href={`/dashboard/help/admin/articles/${a.id}/edit`}
              className="block bg-white border border-purple-100 rounded-lg px-4 py-3 hover:border-purple-300"
            >
              <span className="font-medium">{a.title}</span>
              <span className="text-sm text-gray-500 ml-2">
                {a.slug} · {a.published ? "gepubliceerd" : "concept"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
