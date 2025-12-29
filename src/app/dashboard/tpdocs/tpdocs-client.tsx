"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
      if (!res.ok) throw new Error(data?.error || "Fout bij ondertekenen URL");
      setPreviewUrl(data.url as string);
    } catch (e: any) {
      setErr(e?.message || "Kon voorbeeld niet laden");
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
      if (!res.ok) throw new Error(data?.error || "Verwijderen mislukt");

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
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TP</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{r.employeeName}</span>
                    <span className="text-xs text-muted-foreground">{r.employeeEmail}</span>
                  </div>
                </TableCell>
                <TableCell>{r.clientName}</TableCell>
                <TableCell>{fmtStable(r.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(r)}
                  >
                    Openen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && (
              <TableRow>
                <TableCell className="px-4 py-6 text-sm text-muted-foreground text-center" colSpan={5}>
                  Geen TP documenten gevonden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Preview modal */}
      {openId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-card-foreground">{active?.title || "Document"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {active?.employeeName} • {active?.clientName}
                </div>
              </div>
              <button onClick={closeModal} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors" aria-label="Close">✕</button>
            </div>

            <div className="h-[78vh] w-full bg-muted/30">
              {!active?.url && <div className="p-6 text-sm text-error-600">Geen bestandspad op deze rij.</div>}
              {active?.url && loading && (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading preview…
                </div>
              )}
              {active?.url && !loading && err && (
                <div className="p-6 text-sm text-error-600">Couldn't load the file preview. {err}</div>
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

            <div className="flex items-center justify-end gap-2 border-t border-border bg-card px-4 py-2">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted transition-colors"
                >
                  Openen in nieuw tabblad
                </a>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={requestDelete}
                disabled={!active?.url || deleting}
              >
                Verwijderen
              </Button>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Sluiten
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDeleteModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
