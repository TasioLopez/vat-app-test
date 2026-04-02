"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

type Cat = { id: string; title: string; slug: string };

export default function NewArticlePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const defaultLocale = sp.get("locale") === "nl" ? "nl" : "en";

  const [categories, setCategories] = useState<Cat[]>([]);
  const [locale, setLocale] = useState(defaultLocale);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [translationGroupId, setTranslationGroupId] = useState("");

  const loadCats = useCallback(async () => {
    const res = await fetch("/api/help/admin/categories");
    const j = await res.json();
    const cats: Cat[] = j.categories || [];
    setCategories(cats);
    if (cats[0]?.id) setCategoryId((prev) => prev || cats[0].id);
  }, []);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  const uploadImage = async (file: File) => {
    const sign = await fetch("/api/help/admin/media/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    const sj = await sign.json();
    if (!sign.ok) {
      alert(sj.error || "Sign failed");
      return;
    }
    const put = await fetch(sj.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) {
      alert("Upload failed");
      return;
    }
    const path = sj.path as string;
    setBody((b) => `${b}\n\n![image](${path})\n`);
  };

  const save = async () => {
    const res = await fetch("/api/help/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        categoryId,
        title,
        slug,
        body,
        excerpt: excerpt || null,
        published: true,
        translationGroupId: translationGroupId || undefined,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      router.push(`/dashboard/help/admin/articles/${j.id}/edit`);
    } else {
      alert(j.error || "Save failed");
    }
  };

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Link href="/dashboard/help/admin/articles" className="text-purple-700 inline-flex items-center gap-2">
        <FaArrowLeft /> Articles
      </Link>
      <h1 className="text-2xl font-bold">New article</h1>
      <div className="grid gap-3">
        <label className="text-sm font-medium">Link to existing translation (optional UUID)</label>
        <input
          className="border rounded-lg px-3 py-2"
          value={translationGroupId}
          onChange={(e) => setTranslationGroupId(e.target.value)}
          placeholder="translation_group_id for NL/EN pair"
        />
        <select
          className="border rounded-lg px-3 py-2"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
        >
          <option value="en">English</option>
          <option value="nl">Nederlands</option>
        </select>
        <select
          className="border rounded-lg px-3 py-2"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm">Image upload</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f);
            }}
          />
        </div>
        <textarea
          className="border rounded-lg px-3 py-2 font-mono text-sm min-h-[320px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Markdown body"
        />
      </div>
      <button type="button" onClick={save} className="px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold">
        Save & index
      </button>
    </div>
  );
}
