"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal"; // ← your modal

type Row = {
  id: string;
  employee_id: string;
  title: string;
  url: string | null;         // documents/<employee_id>/<file>.pdf
  employeeName: string;
  employeeEmail: string;
  clientName: string;
  created_at: string | null;  // ISO string
};

export default function TPDocsClient({ rows }: { rows?: Row[] }) {
  // local copy so we can remove items after delete
  const [list, setList] = useState<Row[]>(rows ?? []);
  useEffect(() => setList(rows ?? []), [rows]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // delete flow
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const active = useMemo(
    () => list.find((r) => r.id === openId) ?? null,
    [list, openId]
  );

  function fmtStable(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    return `${dd}-${m}-${y}, ${hh}:${mi}`;
  }

  async function openPreview(r: Row) {
    setOpenId(r.id);
    setPreviewUrl(null);
    setErr(null);
    if (!r.url) return;

    setLoading(true);
    try {
      const res = await fetch("/api/storage/sign-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: r.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to sign URL");
      setPreviewUrl(data.url as string);
    } catch (e: any) {
      setErr(e?.message || "Could not load preview");
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setOpenId(null);
    setPreviewUrl(null);
    setErr(null);
  }

  // open the confirm dialog
  function requestDelete() {
    if (!active?.url) return;
    setConfirmOpen(true);
  }

  // confirm in the dialog
  async function confirmDelete() {
    if (!active?.url) return;
    setDeleting(true);
    setErr(null);
    try {
      const res = await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // pass both path and docId if you want the DB row removed too
        body: JSON.stringify({ path: active.url, docId: active.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      // update UI
      setList((prev) => prev.filter((r) => r.id !== active.id));
      setConfirmOpen(false);
      closeModal();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

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
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span>{r.employeeName}</span>
                    <span className="text-xs text-gray-500">{r.employeeEmail}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{r.clientName}</td>
                <td className="px-4 py-3">{fmtStable(r.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openPreview(r)}
                    className="inline-flex items-center rounded-md border px-3 py-1 text-xs hover:bg-gray-100"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                  No TP documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview modal */}
      {openId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{active?.title || "Document"}</div>
                <div className="truncate text-xs text-gray-500">
                  {active?.employeeName} • {active?.clientName}
                </div>
              </div>
              <button onClick={closeModal} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
            </div>

            <div className="h-[78vh] w-full bg-gray-50">
              {!active?.url && <div className="p-6 text-sm text-red-600">No file path on this row.</div>}
              {active?.url && loading && (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Loading preview…
                </div>
              )}
              {active?.url && !loading && err && (
                <div className="p-6 text-sm text-red-600">Couldn’t load the file preview. {err}</div>
              )}
              {active?.url && !loading && !err && previewUrl && (
                <object
                  data={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  type="application/pdf"
                  className="h-full w-full"
                >
                  <iframe src={previewUrl} className="h-full w-full" />
                </object>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-white px-4 py-2">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border px-3 py-1 text-xs hover:bg-gray-100"
                >
                  Open in new tab
                </a>
              )}
              <button
                onClick={requestDelete}
                disabled={!active?.url || deleting}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
              <button onClick={closeModal} className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-black">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog (ShadCN) */}
      <ConfirmDeleteModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
