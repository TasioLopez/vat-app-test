"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { OrgUserSelect } from "@/components/users/OrgUserSelect";
import {
  fetchOrgDirectory,
  formatOrgUserDisplayName,
  type OrgDirectoryUser,
} from "@/lib/users/org-directory";
import {
  allEmployeesHaveNewOwner,
  summarizeOwnerAssignments,
} from "@/lib/users/delete-user-assignments";

export type DeleteUserTarget = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type OwnedEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  client_id: string | null;
  client_name: string | null;
};

type DeleteUserModalProps = {
  open: boolean;
  user: DeleteUserTarget | null;
  currentUserId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (userId: string) => void;
};

export default function DeleteUserModal({
  open,
  user,
  currentUserId,
  onOpenChange,
  onDeleted,
}: DeleteUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<OwnedEmployee[]>([]);
  const [directory, setDirectory] = useState<OrgDirectoryUser[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOwnerId, setBulkOwnerId] = useState<string | null>(null);

  const targetId = user?.id ?? null;
  const targetLabel = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email
    : "";

  const candidateUsers = useMemo(
    () => directory.filter((u) => u.id !== targetId),
    [directory, targetId]
  );

  const resetState = useCallback(() => {
    setLoading(false);
    setFetching(false);
    setError(null);
    setOwned([]);
    setDirectory([]);
    setAssignments({});
    setSelectedIds(new Set());
    setBulkOwnerId(null);
  }, []);

  useEffect(() => {
    if (!open || !targetId) {
      resetState();
      return;
    }

    let cancelled = false;
    setFetching(true);
    setError(null);

    void (async () => {
      try {
        const [empRes, dir] = await Promise.all([
          supabase
            .from("employees")
            .select("id, first_name, last_name, client_id, clients(name)")
            .eq("owner_id", targetId)
            .order("last_name", { ascending: true }),
          fetchOrgDirectory(supabase),
        ]);

        if (cancelled) return;

        if (empRes.error) {
          setError(empRes.error.message);
          setOwned([]);
          setAssignments({});
          setSelectedIds(new Set());
        } else {
          const rows: OwnedEmployee[] = (empRes.data ?? []).map((row) => {
            const clients = row.clients as { name?: string } | { name?: string }[] | null;
            const clientName = Array.isArray(clients)
              ? clients[0]?.name ?? null
              : clients?.name ?? null;
            return {
              id: row.id as string,
              first_name: (row.first_name as string) ?? "",
              last_name: (row.last_name as string) ?? "",
              client_id: (row.client_id as string | null) ?? null,
              client_name: clientName,
            };
          });
          setOwned(rows);
          setAssignments(Object.fromEntries(rows.map((r) => [r.id, null])));
          setSelectedIds(new Set(rows.map((r) => r.id)));
        }

        setDirectory(dir);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Laden mislukt");
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, targetId, resetState]);

  const allSelected = owned.length > 0 && selectedIds.size === owned.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < owned.length;
  const canConfirm =
    !fetching &&
    !loading &&
    owned.length > 0 &&
    targetId != null &&
    allEmployeesHaveNewOwner(owned.map((e) => e.id), assignments, targetId);

  const ownerSummary = useMemo(() => {
    const counts = summarizeOwnerAssignments(assignments);
    return counts.map(({ ownerId, count }) => {
      const u = directory.find((d) => d.id === ownerId);
      return {
        ownerId,
        count,
        label: u ? formatOrgUserDisplayName(u) : ownerId,
      };
    });
  }, [assignments, directory]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(owned.map((e) => e.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulk = () => {
    if (!bulkOwnerId || selectedIds.size === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        next[id] = bulkOwnerId;
      }
      return next;
    });
  };

  const deleteUser = async (payloadAssignments: { employeeId: string; ownerId: string }[]) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: targetId,
          assignments: payloadAssignments,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.error === "string" ? data.error : "Verwijderen mislukt."
        );
        return;
      }
      onDeleted(targetId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWithAssignments = async () => {
    if (!targetId || !canConfirm) return;
    const payload = owned.map((e) => ({
      employeeId: e.id,
      ownerId: assignments[e.id] as string,
    }));
    await deleteUser(payload);
  };

  const handleConfirmEmpty = async () => {
    await deleteUser([]);
  };

  // Zero-dossier path: short confirm dialog
  if (open && user && !fetching && owned.length === 0 && !error) {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !loading) onOpenChange(false);
        }}
        title="Gebruiker verwijderen"
        description={`Geen dossiers. Gebruiker ${targetLabel} verwijderen?`}
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        variant="destructive"
        loading={loading}
        onConfirm={handleConfirmEmpty}
      />
    );
  }

  return (
    <Dialog
      open={open && !!user}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-hidden flex flex-col sm:max-w-3xl"
        onPointerDownOutside={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Gebruiker verwijderen — dossiers hertoewijzen</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {targetLabel} is dossier-eigenaar van {owned.length} werknemer
          {owned.length === 1 ? "" : "s"}. Wijs elke dossier toe aan een andere
          gebruiker voordat je verwijdert.
        </p>

        {fetching ? (
          <p className="text-sm text-muted-foreground py-6">Laden…</p>
        ) : (
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Nieuwe eigenaar voor selectie
                </label>
                <OrgUserSelect
                  supabase={supabase}
                  value={bulkOwnerId}
                  onChange={(id) => setBulkOwnerId(id)}
                  users={candidateUsers}
                  currentUserId={currentUserId}
                  placeholder="Selecteer eigenaar…"
                  disabled={loading}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={loading || !bulkOwnerId || selectedIds.size === 0}
                onClick={applyBulk}
              >
                Toepassen op selectie ({selectedIds.size})
              </Button>
            </div>

            <div className="rounded-md border border-border overflow-hidden min-h-0 flex-1">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  disabled={loading || owned.length === 0}
                  aria-label="Alles selecteren"
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Werknemers</span>
              </div>
              <ScrollArea className="h-[min(360px,50vh)]">
                <ul className="divide-y divide-border">
                  {owned.map((emp) => {
                    const name = `${emp.first_name} ${emp.last_name}`.trim() || "Naamloos";
                    return (
                      <li
                        key={emp.id}
                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.id)}
                          onChange={() => toggleRow(emp.id)}
                          disabled={loading}
                          aria-label={`Selecteer ${name}`}
                          className="h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {name}
                          </div>
                          {emp.client_name ? (
                            <div className="text-xs text-muted-foreground truncate">
                              {emp.client_name}
                            </div>
                          ) : null}
                        </div>
                        <div className="w-full sm:w-[220px]">
                          <OrgUserSelect
                            supabase={supabase}
                            value={assignments[emp.id]}
                            onChange={(id) =>
                              setAssignments((prev) => ({ ...prev, [emp.id]: id }))
                            }
                            users={candidateUsers}
                            currentUserId={currentUserId}
                            placeholder="Nieuwe eigenaar…"
                            disabled={loading}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </div>

            {ownerSummary.length > 0 ? (
              <div className="text-xs text-muted-foreground">
                Samenvatting:{" "}
                {ownerSummary.map((s, i) => (
                  <span key={s.ownerId}>
                    {i > 0 ? " · " : ""}
                    {s.label}: {s.count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nog geen nieuwe eigenaren gekozen.
              </p>
            )}
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Annuleren
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            onClick={() => void handleConfirmWithAssignments()}
          >
            {loading ? "…" : "Hertoewijzen en verwijderen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
