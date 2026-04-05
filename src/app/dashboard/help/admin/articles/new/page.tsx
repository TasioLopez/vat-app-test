"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { KbArticleBodyEditor } from "@/components/help/KbArticleBodyEditor";
import { HELP_DEFAULT_LOCALE } from "@/lib/help/constants";

type Cat = { id: string; title: string; slug: string };

export default function NewArticlePage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Cat[]>([]);
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

  const uploadKbMediaImage = useCallback(async (file: File): Promise<string> => {
    const sign = await fetch("/api/help/admin/media/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    const sj = await sign.json();
    if (!sign.ok) {
      alert(sj.error || "Ondertekenen mislukt");
      throw new Error(sj.error || "Ondertekenen mislukt");
    }
    const put = await fetch(sj.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) {
      alert("Upload mislukt");
      throw new Error("Upload mislukt");
    }
    return sj.path as string;
  }, []);

  const save = async () => {
    const res = await fetch("/api/help/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: HELP_DEFAULT_LOCALE,
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
      alert(j.error || "Opslaan mislukt");
    }
  };

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Link href="/dashboard/help/admin/articles" className="text-purple-700 inline-flex items-center gap-2">
        <FaArrowLeft /> Artikelen
      </Link>
      <h1 className="text-2xl font-bold">Nieuw artikel</h1>
      <div className="grid gap-3">
        <label className="text-sm font-medium">Koppeling bestaande vertaling (optioneel, UUID)</label>
        <input
          className="border rounded-lg px-3 py-2"
          value={translationGroupId}
          onChange={(e) => setTranslationGroupId(e.target.value)}
          placeholder="translation_group_id"
        />
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
          placeholder="Titel"
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
          placeholder="Samenvatting"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <label className="text-sm font-medium">Inhoud</label>
        <KbArticleBodyEditor
          markdown={body}
          onMarkdownChange={setBody}
          uploadKbMediaImage={uploadKbMediaImage}
          placeholder="Typ of plak tekst; gebruik de werkbalk voor koppen, lijsten en afbeeldingen."
        />
      </div>
      <button type="button" onClick={save} className="px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold">
        Opslaan &amp; indexeren
      </button>
    </div>
  );
}
