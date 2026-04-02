"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";

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

  useEffect(() => {
    (async () => {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/help/tickets"),
        fetch("/api/help/ticket-categories"),
      ]);
      const tj = await tRes.json();
      const cj = await cRes.json();
      setTickets(tj.tickets || []);
      const map: Record<string, string> = {};
      for (const c of cj.categories || []) {
        map[c.id] = c.label_en;
      }
      setCats(map);
    })();
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/dashboard/help" className="text-purple-700 font-medium inline-flex items-center gap-2">
          <FaArrowLeft /> Help home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">My tickets</h1>
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/help/tickets/${t.id}`}
                className="block bg-white rounded-xl border border-purple-100 p-4 hover:border-purple-300 shadow-sm"
              >
                <div className="font-semibold text-gray-900">{t.subject}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {cats[t.category_id] || "Category"} · {t.status} ·{" "}
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {tickets.length === 0 ? <p className="text-gray-500">No tickets yet.</p> : null}
      </div>
    </div>
  );
}
