"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { ticketPriorityLabelNl, ticketStatusLabelNl } from "@/lib/help/ticket-labels";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  category_id: string;
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cats, setCats] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/help/tickets"),
      fetch("/api/help/ticket-categories"),
    ]);
    const tj = await tRes.json();
    const cj = await cRes.json();
    setTickets(tj.tickets || []);
    const map: Record<string, string> = {};
    for (const c of cj.categories || []) {
      map[c.id] = c.label_nl;
    }
    setCats(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [load]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/dashboard/help" className="text-purple-700 font-medium inline-flex items-center gap-2">
          <FaArrowLeft /> Help
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Mijn tickets</h1>
          <Link
            href="/dashboard/help/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white font-semibold"
          >
            <FaPlus /> Nieuw ticket
          </Link>
        </div>
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/help/tickets/${t.id}`}
                className="block bg-white rounded-xl border border-purple-100 p-4 hover:border-purple-300 shadow-sm"
              >
                <div className="font-semibold text-gray-900">{t.subject}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {cats[t.category_id] || "Categorie"} · {ticketStatusLabelNl(t.status)} ·{" "}
                  {ticketPriorityLabelNl(t.priority)} · {new Date(t.created_at).toLocaleString("nl-NL")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {tickets.length === 0 ? <p className="text-gray-500">Nog geen tickets.</p> : null}
      </div>
    </div>
  );
}
