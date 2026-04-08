"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "sonner";
import { useHelpNotifications } from "@/context/HelpNotificationsContext";

type TicketCategory = {
  id: string;
  label_en: string;
  label_nl: string;
};

export default function NewTicketPage() {
  const router = useRouter();
  const { refresh: refreshNotifications } = useHelpNotifications();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingCategories(true);
      setError("");
      try {
        const res = await fetch("/api/help/ticket-categories");
        const j = await res.json();
        if (!res.ok) {
          const msg = j.error || "Kon categorieen niet laden.";
          setError(msg);
          toast.error(msg);
          return;
        }
        const nextCategories = j.categories || [];
        setCategories(nextCategories);
        if (nextCategories[0]?.id) {
          setCategoryId(nextCategories[0].id);
        }
      } catch {
        setError("Netwerkfout bij laden van categorieen.");
        toast.error("Netwerkfout bij laden van categorieen.");
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryId || !subject.trim() || !description.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/help/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        const msg = j.error || "Ticket aanmaken mislukt.";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Ticket aangemaakt");
      await refreshNotifications();
      router.push(`/dashboard/help/tickets/${j.id}`);
    } catch {
      setError("Netwerkfout bij ticket aanmaken.");
      toast.error("Netwerkfout bij ticket aanmaken.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/dashboard/help/tickets" className="text-purple-700 font-medium inline-flex items-center gap-2">
          <FaArrowLeft /> Mijn tickets
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nieuw ticket</h1>
          <p className="text-gray-600 mt-1">
            Beschrijf je vraag zo duidelijk mogelijk. We reageren binnen 3 werkdagen.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
              Categorie
            </label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loadingCategories || categories.length === 0}
              className="w-full rounded-lg border border-purple-200 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label_nl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Onderwerp
            </label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Korte samenvatting van je vraag"
              className="w-full rounded-lg border border-purple-200 px-3 py-2"
              maxLength={500}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Beschrijving
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wat gebeurt er precies, en welke stap probeerde je uit te voeren?"
              className="w-full rounded-lg border border-purple-200 px-3 py-2"
              rows={7}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                submitting || loadingCategories || !categoryId || !subject.trim() || !description.trim()
              }
              className="px-4 py-2 rounded-lg bg-purple-700 text-white font-semibold disabled:opacity-50"
            >
              {submitting ? "Versturen..." : "Ticket aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
