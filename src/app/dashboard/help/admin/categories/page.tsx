"use client";

import { useCallback, useEffect, useState } from "react";

type Cat = {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  tool_key: string | null;
};

export default function AdminCategoriesPage() {
  const [list, setList] = useState<Cat[]>([]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/help/admin/categories");
    const j = await res.json();
    setList(j.categories || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const res = await fetch("/api/help/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title,
        parentId: parentId || null,
        sortOrder,
      }),
    });
    if (res.ok) {
      setSlug("");
      setTitle("");
      load();
    } else {
      const j = await res.json();
      alert(j.error || "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete category? Articles must be moved first.")) return;
    const res = await fetch(`/api/help/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      alert(j.error || "Failed");
    } else load();
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">KB Categories</h1>
      <div className="bg-white rounded-xl border border-purple-100 p-6 space-y-4">
        <h2 className="font-semibold">New category</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="slug (e.g. my-section)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">No parent (top level)</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="border rounded-lg px-3 py-2"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        <button type="button" onClick={create} className="px-4 py-2 bg-purple-700 text-white rounded-lg">
          Create
        </button>
      </div>
      <ul className="space-y-2">
        {list.map((c) => (
          <li
            key={c.id}
            className="flex justify-between items-center bg-white border border-purple-100 rounded-lg px-4 py-3"
          >
            <div>
              <span className="font-medium">{c.title}</span>
              <span className="text-sm text-gray-500 ml-2">{c.slug}</span>
            </div>
            <button type="button" onClick={() => remove(c.id)} className="text-red-600 text-sm">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
