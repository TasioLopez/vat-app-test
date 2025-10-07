"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client"; // your existing browser client
import { X } from "lucide-react"; // or remove if you don't use lucide
import Link from "next/link";

type Row = {
  id: string;
  title: string;
  employeeName: string;
  employeeEmail: string;
  clientName: string;
  created_at: string | null;
  storagePath: string | null; // path in your `documents` bucket or full key like "documents/xxx"
};

type Props = { rows: Row[] };

export default function TPDocsTable({ rows }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Row | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // Strip "documents/" if present (Supabase expects key relative to bucket)
  function toBucketKey(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith("documents/") ? url.slice("documents/".length) : url;
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setSignedUrl(null);
      setSignError(null);
      if (!active?.storagePath) return;

      const fileKey = toBucketKey(active.storagePath);
      if (!fileKey) return;

      setLoading(true);
      const { data, error } = await supabase
        .storage
        .from("documents")
        .createSignedUrl(fileKey, 60 * 10); // 10 minutes

      if (cancelled) return;
      setLoading(false);

      if (error) {
        setSignError(error.message);
      } else {
        setSignedUrl(data?.signedUrl ?? null);
      }
    }
    if (open && active) run();

    return () => { cancelled = true; };
  }, [open, active]);

  const onOpen = (row: Row) => {
    setActive(row);
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
    setActive(null);
    setSignedUrl(null);
    setSignError(null);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="border-b">
              <th className="px-4 py-3">TP</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Employer</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 w-36"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span>{r.employeeName}</span>
                    <span className="text-xs text-gray-500">{r.employeeEmail}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{r.clientName}</td>
                <td className="px-4 py-3">{r.created_at ? new Date(r.created_at).toLocaleString("nl-NL") : "—"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onOpen(r)}
                    className="inline-flex items-center rounded-md border px-3 py-1 text-xs hover:bg-gray-100"
                  >
                    Openen
                  </button>
                  {r.storagePath && (
                    <Link
                      href="#"
                      onClick={(e) => { e.preventDefault(); onOpen(r); }}
                      className="inline-flex items-center rounded-md border px-3 py-1 text-xs hover:bg-gray-100"
                    >
                      Preview
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[95vw] max-w-5xl h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate">
                    {active?.title || "Document"}
                  </h2>
                  <p className="text-xs text-gray-500 truncate">
                    {active?.employeeName} · {active?.clientName}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-gray-100"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden">
                {loading && (
                  <div className="h-full w-full flex items-center justify-center text-sm text-gray-600">
                    Loading preview…
                  </div>
                )}
                {signError && (
                  <div className="p-4 text-sm text-red-600">
                    Couldn’t load the file preview. {signError}
                  </div>
                )}
                {!loading && !signError && signedUrl && (
                  <iframe
                    src={signedUrl}
                    className="w-full h-full"
                    title="Document preview"
                    loading="eager"
                  />
                )}
                {!loading && !signError && !signedUrl && (
                  <div className="h-full w-full flex items-center justify-center text-sm text-gray-600">
                    No preview available.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t flex items-center justify-end gap-2">
                {signedUrl && (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border px-3 py-1 text-xs hover:bg-gray-100"
                  >
                    Openen in nieuw tabblad
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="inline-flex items-center rounded-md bg-gray-900 text-white px-3 py-1 text-xs hover:bg-black"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
