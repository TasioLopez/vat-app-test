"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELECT_CLASS } from "@/lib/select-class";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  employee_id: string;
  title: string;
  url: string | null;
  type: string;
  typeLabel: string;
  layout_key: string | null;
  employeeName: string;
  employeeEmail: string;
  clientName: string;
  created_at: string | null;
};

type TypeOption = { value: string; label: string };

type Recency = "all" | "7" | "30" | "90";

function typeBadgeLabel(r: Row): string {
  if (r.type === "tp") {
    return r.layout_key === "tp_2026" ? "Trajectplan" : "Trajectplan (oud)";
  }
  return r.typeLabel;
}

export default function TPDocsClient({
  rows,
  typeOptions = [],
  clientOptions = [],
}: {
  rows?: Row[];
  typeOptions?: TypeOption[];
  clientOptions?: string[];
}) {
  const [list, setList] = useState<Row[]>(rows ?? []);
  useEffect(() => setList(rows ?? []), [rows]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [recency, setRecency] = useState<Recency>("all");

  const [openId, setOpenId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const recencyMs =
      recency === "7"
        ? 7 * 24 * 60 * 60 * 1000
        : recency === "30"
          ? 30 * 24 * 60 * 60 * 1000
          : recency === "90"
            ? 90 * 24 * 60 * 60 * 1000
            : null;

    return list.filter((r) => {
      if (selectedType !== "all" && r.type !== selectedType) return false;
      if (selectedClient !== "all" && r.clientName !== selectedClient) return false;
      if (recencyMs != null) {
        if (!r.created_at) return false;
        const t = new Date(r.created_at).getTime();
        if (Number.isNaN(t) || now - t > recencyMs) return false;
      }
      if (!q) return true;
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeEmail.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q)
      );
    });
  }, [list, searchQuery, selectedType, selectedClient, recency]);

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

  function requestDelete() {
    if (!active?.url) return;
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!active?.url) return;
    setDeleting(true);
    setErr(null);
    try {
      const res = await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: active.url, docId: active.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verwijderen mislukt");

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Zoek op persoon, werkgever of titel…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="relative w-full sm:w-48">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className={cn(SELECT_CLASS, "w-full px-9")}>
              <SelectValue placeholder="Alle types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {clientOptions.length > 0 ? (
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className={cn(SELECT_CLASS, "w-full sm:w-48")}>
              <SelectValue placeholder="Alle werkgevers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle werkgevers</SelectItem>
              {clientOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select value={recency} onValueChange={(v) => setRecency(v as Recency)}>
          <SelectTrigger className={cn(SELECT_CLASS, "w-full sm:w-40")}>
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alles</SelectItem>
            <SelectItem value="7">7 dagen</SelectItem>
            <SelectItem value="30">30 dagen</SelectItem>
            <SelectItem value="90">90 dagen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Werknemer</TableHead>
              <TableHead>Werkgever</TableHead>
              <TableHead>Aangemaakt</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{r.title}</span>
                    <span className="shrink-0 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {typeBadgeLabel(r)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{r.employeeName}</span>
                    <span className="text-xs text-muted-foreground">{r.employeeEmail}</span>
                  </div>
                </TableCell>
                <TableCell>{r.clientName}</TableCell>
                <TableCell>{fmtStable(r.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openPreview(r)}>
                    Openen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={5}>
                  Geen documenten gevonden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "document" : "documenten"}
        {filtered.length !== list.length ? ` (van ${list.length})` : ""}
      </p>

      {openId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-card-foreground">
                  {active?.title || "Document"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {active?.typeLabel} • {active?.employeeName} • {active?.clientName}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="h-[78vh] w-full bg-muted/30">
              {!active?.url && (
                <div className="p-6 text-sm text-error-600">Geen bestandspad op deze rij.</div>
              )}
              {active?.url && loading && (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Voorbeeld laden…
                </div>
              )}
              {active?.url && !loading && err && (
                <div className="p-6 text-sm text-error-600">
                  Couldn&apos;t load the file preview. {err}
                </div>
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
                  className="rounded-md border border-border px-3 py-1 text-xs transition-colors hover:bg-muted"
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

      <ConfirmDeleteModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
