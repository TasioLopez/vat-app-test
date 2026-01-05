"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { X } from "lucide-react";
import Link from "next/link";
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
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TP</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-36"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{r.employeeName}</span>
                    <span className="text-xs text-muted-foreground">{r.employeeEmail}</span>
                  </div>
                </TableCell>
                <TableCell>{r.clientName}</TableCell>
                <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString("nl-NL") : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                    onClick={() => onOpen(r)}
                  >
                    Openen
                    </Button>
                  {r.storagePath && (
                      <Button
                        variant="outline"
                        size="sm"
                      onClick={(e) => { e.preventDefault(); onOpen(r); }}
                    >
                      Preview
                      </Button>
                  )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[95vw] max-w-5xl h-[85vh] bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate text-card-foreground">
                    {active?.title || "Document"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {active?.employeeName} · {active?.clientName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden bg-muted/30">
                {loading && (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    Loading preview…
                  </div>
                )}
                {signError && (
                  <div className="p-4 text-sm text-error-600">
                    Couldn't load the file preview. {signError}
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
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    No preview available.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border flex items-center justify-end gap-2">
                {signedUrl && (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    Openen in nieuw tabblad
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>
                  Sluiten
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
