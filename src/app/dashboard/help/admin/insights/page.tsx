"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TICKET_STATUS_VALUES, ticketStatusLabelNl } from "@/lib/help/ticket-labels";

type Insights = {
  totalTickets: number;
  byStatus: Record<string, number>;
  categoryBreakdown: { categoryId: string; label: string; count: number }[];
  slaResolvedWithin3BusinessDays: { met: number; total: number; rate: number } | null;
};

export default function HelpInsightsPage() {
  const [data, setData] = useState<Insights | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/help/admin/insights");
    const j = await res.json();
    setData(j);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusRows = useMemo(() => {
    if (!data?.byStatus) return [];
    const known = [...TICKET_STATUS_VALUES].map((key) => [key, data.byStatus[key] ?? 0] as const);
    const extra = Object.entries(data.byStatus).filter(
      ([k]) => !TICKET_STATUS_VALUES.includes(k as (typeof TICKET_STATUS_VALUES)[number])
    );
    const combined = [...known, ...extra].filter(([, v]) => v > 0);
    const orderIdx = (statusKey: string) => {
      const i = TICKET_STATUS_VALUES.indexOf(statusKey as (typeof TICKET_STATUS_VALUES)[number]);
      return i >= 0 ? i : 1000;
    };
    return combined.sort((a, b) => orderIdx(a[0]) - orderIdx(b[0]) || a[0].localeCompare(b[0]));
  }, [data]);

  if (!data) return <div className="p-8">Laden…</div>;

  const maxStatus = Math.max(1, ...statusRows.map(([, v]) => v));
  const maxCat = Math.max(1, ...data.categoryBreakdown.map((c) => c.count));

  return (
    <div className="p-8 space-y-10 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Helpcentrum: inzichten</h1>
      <p className="text-gray-600">Totaal tickets: {data.totalTickets}</p>
      {data.slaResolvedWithin3BusinessDays ? (
        <p className="text-gray-700">
          Binnen 3 werkdagen opgelost: {Math.round(data.slaResolvedWithin3BusinessDays.rate * 100)}% (
          {data.slaResolvedWithin3BusinessDays.met}/{data.slaResolvedWithin3BusinessDays.total})
        </p>
      ) : (
        <p className="text-gray-500 text-sm">Nog geen opgeloste tickets voor SLA-statistieken.</p>
      )}
      <div className="bg-white rounded-xl border border-purple-100 p-6 space-y-4">
        <h2 className="font-semibold">Per status</h2>
        <ul className="space-y-2">
          {statusRows.map(([name, value]) => (
            <li key={name} className="flex items-center gap-3">
              <span className="w-48 shrink-0 text-sm text-gray-600">{ticketStatusLabelNl(name)}</span>
              <div className="flex-1 h-6 bg-purple-100 rounded overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded"
                  style={{ width: `${(value / maxStatus) * 100}%` }}
                />
              </div>
              <span className="w-8 text-sm font-medium">{value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white rounded-xl border border-purple-100 p-6 space-y-4">
        <h2 className="font-semibold">Per categorie</h2>
        <ul className="space-y-2">
          {data.categoryBreakdown.map((c) => (
            <li key={c.categoryId} className="flex items-center gap-3">
              <span className="w-48 text-sm text-gray-600 truncate" title={c.label}>
                {c.label}
              </span>
              <div className="flex-1 h-6 bg-violet-100 rounded overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded"
                  style={{ width: `${(c.count / maxCat) * 100}%` }}
                />
              </div>
              <span className="w-8 text-sm font-medium">{c.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
