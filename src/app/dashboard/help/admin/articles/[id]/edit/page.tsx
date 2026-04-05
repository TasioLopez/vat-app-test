"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { KbArticleBodyEditor } from "@/components/help/KbArticleBodyEditor";

type Cat = { id: string; title: string };

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Cat[]>([]);
  const [locale, setLocale] = useState("nl");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(true);
  const [articleLoaded, setArticleLoaded] = useState(false);

  const load = useCallback(async () => {
    setArticleLoaded(false);
    const [aRes, cRes] = await Promise.all([
      fetch(`/api/help/admin/articles/${id}`),
      fetch("/api/help/admin/categories"),
    ]);
    const aj = await aRes.json();
    const cj = await cRes.json();
    if (!aRes.ok) {
      alert(aj.error || "Laden mislukt");
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
    setCategories(cj.categories || []);
    setArticleLoaded(true);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!res.ok) alert(j.error || "Opslaan mislukt");
    else alert("Opgeslagen en opnieuw geïndexeerd.");
  };

  const del = async () => {
    if (!confirm("Artikel verwijderen?")) return;
    const res = await fetch(`/api/help/admin/articles/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/help/admin/articles");
    else alert("Verwijderen mislukt");
  };

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <Link href="/dashboard/help/admin/articles" className="text-purple-700 inline-flex items-center gap-2">
        <FaArrowLeft /> Artikelen
      </Link>
      <h1 className="text-2xl font-bold">Artikel bewerken</h1>
      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Gepubliceerd (zichtbaar in zoekfunctie en chat)
        </label>
        {locale !== "nl" ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Dit artikel heeft taalcode «{locale}». De gebruikerssite toont alleen Nederlands ({`locale=nl`}); overweeg
            inhoud te migreren naar een NL-artikel.
          </p>
        ) : null}
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
          placeholder="Samenvatting"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <label className="text-sm font-medium">Inhoud</label>
        {articleLoaded ? (
          <KbArticleBodyEditor
            markdown={body}
            onMarkdownChange={setBody}
            uploadKbMediaImage={uploadKbMediaImage}
            placeholder="Typ of plak tekst; gebruik de werkbalk voor koppen, lijsten en afbeeldingen."
          />
        ) : (
          <div className="min-h-[360px] rounded-xl border border-purple-200 bg-purple-50/50 animate-pulse p-4 text-sm text-purple-700">
            Artikel laden…
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={save} className="px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold">
          Opslaan
        </button>
        <button type="button" onClick={del} className="px-6 py-3 border border-red-300 text-red-700 rounded-xl">
          Verwijderen
        </button>
      </div>
    </div>
  );
}
