"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHelpNotifications } from "@/context/HelpNotificationsContext";
import { ticketPriorityLabelNl, ticketStatusLabelNl } from "@/lib/help/ticket-labels";

type Row = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  requester: { email: string; first_name: string | null } | null;
};

export default function AdminTicketsPage() {
  const { adminUnreadTicketIds } = useHelpNotifications();
  const unreadSet = useMemo(() => new Set(adminUnreadTicketIds), [adminUnreadTicketIds]);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/help/admin/tickets");
    const j = await res.json();
    setRows(j.tickets || []);
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

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const au = unreadSet.has(a.id) ? 0 : 1;
      const bu = unreadSet.has(b.id) ? 0 : 1;
      if (au !== bu) return au - bu;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rows, unreadSet]);

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
          {sortedRows.map((r) => {
            const isUnread = unreadSet.has(r.id);
            return (
              <tr
                key={r.id}
                className={`border-b border-purple-50 hover:bg-purple-50/50 ${
                  isUnread ? "bg-amber-50/80" : ""
                }`}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/dashboard/help/admin/tickets/${r.id}`} className="text-purple-700 font-medium">
                      {r.subject}
                    </Link>
                    {isUnread ? (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-purple-900">
                        Actie nodig
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="p-3 text-gray-600">{r.requester?.email}</td>
                <td className="p-3">{ticketStatusLabelNl(r.status)}</td>
                <td className="p-3">{ticketPriorityLabelNl(r.priority)}</td>
                <td className="p-3 text-gray-500">{new Date(r.created_at).toLocaleString("nl-NL")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
