"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  requester: { email: string; first_name: string | null } | null;
};

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/help/admin/tickets");
    const j = await res.json();
    setRows(j.tickets || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-8 space-y-4 max-w-6xl overflow-x-auto">
      <h1 className="text-2xl font-bold text-gray-900">Supporttickets</h1>
      <table className="w-full text-sm bg-white rounded-xl border border-purple-100">
        <thead>
          <tr className="border-b border-purple-100 text-left">
            <th className="p-3">Onderwerp</th>
            <th className="p-3">Aanvrager</th>
            <th className="p-3">Status</th>
            <th className="p-3">Prioriteit</th>
            <th className="p-3">Aangemaakt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-purple-50 hover:bg-purple-50/50">
              <td className="p-3">
                <Link href={`/dashboard/help/admin/tickets/${r.id}`} className="text-purple-700 font-medium">
                  {r.subject}
                </Link>
              </td>
              <td className="p-3 text-gray-600">{r.requester?.email}</td>
              <td className="p-3">{r.status}</td>
              <td className="p-3">{r.priority}</td>
              <td className="p-3 text-gray-500">{new Date(r.created_at).toLocaleString("nl-NL")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
