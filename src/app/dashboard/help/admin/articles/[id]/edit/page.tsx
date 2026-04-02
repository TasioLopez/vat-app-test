"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

type Cat = { id: string; title: string };

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [locale, setLocale] = useState("en");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(true);
  const [siblings, setSiblings] = useState<{ id: string; locale: string; slug: string }[]>([]);

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([
      fetch(`/api/help/admin/articles/${id}`),
      fetch("/api/help/admin/categories"),
    ]);
    const aj = await aRes.json();
    const cj = await cRes.json();
    if (!aRes.ok) {
      alert(aj.error || "Load failed");
      return;
    }
    const a = aj.article;
    setLocale(a.locale);
    setCategoryId(a.category_id);
    setTitle(a.title);
    setSlug(a.slug);
    setBody(a.body);
    setExcerpt(a.excerpt || "");
    setPublished(a.published);
    setSiblings(aj.siblings || []);
    setCategories(cj.categories || []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
    const res = await fetch(`/api/help/admin/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        categoryId,
        title,
        slug,
        body,
        excerpt: excerpt || null,
        published,
      }),
    });
    const j = await res.json();
    if (!res.ok) alert(j.error || "Save failed");
    else alert("Saved and re-indexed.");
  };

  const del = async () => {
    if (!confirm("Delete article?")) return;
    const res = await fetch(`/api/help/admin/articles/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/help/admin/articles");
    else alert("Delete failed");
  };

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Link href="/dashboard/help/admin/articles" className="text-purple-700 inline-flex items-center gap-2">
        <FaArrowLeft /> Articles
      </Link>
      <h1 className="text-2xl font-bold">Edit article</h1>
      {siblings.length > 0 ? (
        <p className="text-sm text-gray-600">
          Translations:{" "}
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/help/admin/articles/${s.id}/edit`}
              className="text-purple-700 underline mr-2"
            >
              {s.locale}
            </Link>
          ))}
        </p>
      ) : null}
      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published (included in search & chat)
        </label>
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2"
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
          <span className="text-sm">Image</span>
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
          className="border rounded-lg px-3 py-2 font-mono text-sm min-h-[360px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={save} className="px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold">
          Save
        </button>
        <button type="button" onClick={del} className="px-6 py-3 border border-red-300 text-red-700 rounded-xl">
          Delete
        </button>
      </div>
    </div>
  );
}
