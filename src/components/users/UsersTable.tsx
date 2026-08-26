"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import PhoneInput from "react-phone-input-2";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SELECT_CLASS } from "@/lib/select-class";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormDirty } from "@/hooks/useFormDirty";
import ModalUnsavedGuard, { useGuardedModalClose } from "@/components/unsaved/ModalUnsavedGuard";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
};

type Client = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  client_id: string;
};

function sortedIds(ids: string[] | undefined): string {
  return [...(ids || [])].sort().join(",");
}

export default function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userClients, setUserClients] = useState<Record<string, string[]>>({});
  const [userEmployees, setUserEmployees] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [userSnapshot, setUserSnapshot] = useState<Partial<User> | null>(null);
  const [clientsSnapshot, setClientsSnapshot] = useState<string[]>([]);
  const [employeesSnapshot, setEmployeesSnapshot] = useState<string[]>([]);
  const [editClientSearch, setEditClientSearch] = useState("");
  const [editEmployeeSearch, setEditEmployeeSearch] = useState("");
  const [editModalTab, setEditModalTab] = useState<"profiel" | "toegang">("profiel");
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"werkgevers" | "werknemers" | null>(null);

  const profileDirty = useFormDirty(editedUser, userSnapshot);
  const assignmentsDirty =
    !!editingId &&
    (sortedIds(userClients[editingId]) !== sortedIds(clientsSnapshot) ||
      sortedIds(userEmployees[editingId]) !== sortedIds(employeesSnapshot));
  const isModalDirty = profileDirty || assignmentsDirty;

  const closeEditModal = useCallback(() => {
    if (editingId) {
      setUserClients((prev) => ({ ...prev, [editingId]: clientsSnapshot }));
      setUserEmployees((prev) => ({ ...prev, [editingId]: employeesSnapshot }));
    }
    setEditingId(null);
    setUserSnapshot(null);
    setEditedUser({});
    setEditClientSearch("");
    setEditEmployeeSearch("");
    setClientsSnapshot([]);
    setEmployeesSnapshot([]);
  }, [clientsSnapshot, editingId, employeesSnapshot]);

  const guardedCloseEditModal = useGuardedModalClose(isModalDirty, closeEditModal);

  useEffect(() => {
    const fetchAll = async () => {
      const [userRes, clientRes, employeeRes, userClientRes, empUserRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("clients").select("id, name"),
        supabase.from("employees").select("id, first_name, last_name, client_id"),
        supabase.from("user_clients").select("user_id, client_id"),
        supabase.from("employee_users").select("user_id, employee_id"),
      ]);

      if (userRes.data) setUsers(userRes.data as User[]);
      if (clientRes.data) setClients(clientRes.data as Client[]);
      if (employeeRes.data) setEmployees(employeeRes.data as Employee[]);

      const clientMap: Record<string, string[]> = {};
      userClientRes.data?.forEach((rel) => {
        clientMap[rel.user_id] = [...(clientMap[rel.user_id] || []), rel.client_id];
      });
      setUserClients(clientMap);

      const empMap: Record<string, string[]> = {};
      empUserRes.data?.forEach((rel) => {
        empMap[rel.user_id] = [...(empMap[rel.user_id] || []), rel.employee_id];
      });
      setUserEmployees(empMap);

      setLoading(false);
    };
    void fetchAll();
  }, []);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditedUser(user);
    setUserSnapshot({ ...user });
    setClientsSnapshot([...(userClients[user.id] || [])]);
    setEmployeesSnapshot([...(userEmployees[user.id] || [])]);
    setEditClientSearch("");
    setEditEmployeeSearch("");
    setEditModalTab("profiel");
  };

  const saveUserForGuard = useCallback(async () => {
    if (!editingId) return;

    if (!editedUser.first_name || !editedUser.last_name) {
      throw new Error("Voornaam en achternaam zijn verplicht.");
    }

    if (!editedUser.role || !["admin", "user"].includes(editedUser.role)) {
      throw new Error("Selecteer een geldige rol.");
    }

    const payload = { ...editedUser };
    if (payload.phone) {
      const parsed = parsePhoneNumberFromString(payload.phone);
      if (!parsed?.isValid()) {
        throw new Error("Voer een geldig telefoonnummer in.");
      }
      payload.phone = parsed.number;
    }

    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      throw new Error("Voer een geldig e-mailadres in.");
    }

    const { error: userUpdateError } = await supabase
      .from("users")
      .update(payload)
      .eq("id", editingId);

    if (userUpdateError) {
      throw new Error(userUpdateError.message);
    }

    const { error: deleteClientsError } = await supabase
      .from("user_clients")
      .delete()
      .eq("user_id", editingId);
    if (deleteClientsError) throw new Error(deleteClientsError.message);

    const clientIds = userClients[editingId] || [];
    if (clientIds.length > 0) {
      const { error: insertClientsError } = await supabase.from("user_clients").insert(
        clientIds.map((client_id) => ({ user_id: editingId, client_id }))
      );
      if (insertClientsError) throw new Error(insertClientsError.message);
    }

    const { error: deleteEmployeesError } = await supabase
      .from("employee_users")
      .delete()
      .eq("user_id", editingId);
    if (deleteEmployeesError) throw new Error(deleteEmployeesError.message);

    const employeeIds = userEmployees[editingId] || [];
    if (employeeIds.length > 0) {
      const { error: insertEmployeesError } = await supabase.from("employee_users").insert(
        employeeIds.map((employee_id) => ({
          user_id: editingId,
          employee_id,
          assigned_at: new Date().toISOString(),
        }))
      );
      if (insertEmployeesError) throw new Error(insertEmployeesError.message);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === editingId ? ({ ...u, ...payload } as User) : u))
    );
    setUserSnapshot({ ...payload });
    setClientsSnapshot([...(userClients[editingId] || [])]);
    setEmployeesSnapshot([...(userEmployees[editingId] || [])]);
  }, [editedUser, editingId, userClients, userEmployees]);

  const handleSave = async () => {
    try {
      await saveUserForGuard();
      setEditingId(null);
      setUserSnapshot(null);
      setEditedUser({});
      setEditClientSearch("");
      setEditEmployeeSearch("");
      setClientsSnapshot([]);
      setEmployeesSnapshot([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Opslaan mislukt");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const toggleClientSelection = (userId: string, clientId: string) => {
    const current = new Set(userClients[userId] || []);
    current.has(clientId) ? current.delete(clientId) : current.add(clientId);
    const newSelected = Array.from(current);
    setUserClients((prev) => ({ ...prev, [userId]: newSelected }));
    setUserEmployees((prev) => ({
      ...prev,
      [userId]: (prev[userId] || []).filter((eid) => {
        const emp = employees.find((e) => e.id === eid);
        return emp && newSelected.includes(emp.client_id);
      }),
    }));
  };

  const addEmployee = (userId: string, employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    setUserEmployees((prev) => ({
      ...prev,
      [userId]: [...new Set([...(prev[userId] || []), employeeId])],
    }));
  };

  const removeEmployee = (userId: string, employeeId: string) => {
    setUserEmployees((prev) => ({
      ...prev,
      [userId]: (prev[userId] || []).filter((id) => id !== employeeId),
    }));
  };

  const selectedClientsForEdit = editingId ? userClients[editingId] || [] : [];
  const filteredClientsForEdit = useMemo(() => {
    const q = editClientSearch.trim().toLowerCase();
    if (!q) return [];
    const selected = editingId ? userClients[editingId] || [] : [];
    return clients
      .filter((c) => c.name.toLowerCase().includes(q))
      .filter((c) => !selected.includes(c.id))
      .slice(0, 50);
  }, [clients, editingId, userClients, editClientSearch]);

  const selectableEmployeesForEdit = useMemo(
    () => employees.filter((e) => selectedClientsForEdit.includes(e.client_id)),
    [employees, selectedClientsForEdit]
  );

  const filteredEmployeesForEdit = useMemo(() => {
    const assigned = editingId ? userEmployees[editingId] || [] : [];
    const q = editEmployeeSearch.trim().toLowerCase();
    return selectableEmployeesForEdit
      .filter((e) => !assigned.includes(e.id))
      .filter((e) => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [selectableEmployeesForEdit, editingId, userEmployees, editEmployeeSearch]);

  const renderModal = (user: User) => {
    const uid = user.id;
    const selectedClients = userClients[uid] || [];

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-background/80 z-50 flex items-center justify-center p-4">
        <ModalUnsavedGuard
          open={editingId === uid}
          isDirty={isModalDirty}
          onSave={saveUserForGuard}
          onClose={closeEditModal}
        />
        <div className="bg-card border border-border p-6 rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col">
          <h2 className="text-2xl font-semibold mb-4 text-card-foreground shrink-0">
            Gebruiker bewerken
          </h2>

          <div role="tablist" aria-label="Bewerken secties" className="flex border-b border-border mb-4 shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={editModalTab === "profiel"}
              aria-controls="edit-modal-profiel"
              id="tab-profiel"
              onClick={() => setEditModalTab("profiel")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                editModalTab === "profiel"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Profiel
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editModalTab === "toegang"}
              aria-controls="edit-modal-toegang"
              id="tab-toegang"
              onClick={() => setEditModalTab("toegang")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                editModalTab === "toegang"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Toegang en werknemers
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {editModalTab === "profiel" && (
              <div
                id="edit-modal-profiel"
                role="tabpanel"
                aria-labelledby="tab-profiel"
                className="max-w-md space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Voornaam
                  </label>
                  <Input
                    name="first_name"
                    placeholder="Voornaam"
                    value={editedUser.first_name || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Achternaam
                  </label>
                  <Input
                    name="last_name"
                    placeholder="Achternaam"
                    value={editedUser.last_name || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={editedUser.email || ""}
                    onChange={handleChange}
                  />
                </div>
                <PhoneInput
                  country={"nl"}
                  value={editedUser.phone || ""}
                  onChange={(value) =>
                    setEditedUser({
                      ...editedUser,
                      phone: value.startsWith("+") ? value : "+" + value,
                    })
                  }
                  inputProps={{ name: "phone", required: false }}
                  containerStyle={{ marginBottom: "0.75rem", width: "100%" }}
                  inputStyle={{
                    width: "100%",
                    height: "40px",
                    paddingLeft: "48px",
                    fontSize: "14px",
                  }}
                  buttonStyle={{ border: "none", background: "transparent" }}
                  enableSearch
                />
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Rol</label>
                  <Select
                    value={editedUser.role || undefined}
                    onValueChange={(v) =>
                      handleChange({
                        target: { name: "role", value: v },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                  >
                    <SelectTrigger className={cn(SELECT_CLASS)}>
                      <SelectValue placeholder="Selecteer rol..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Beheerder</SelectItem>
                      <SelectItem value="user">Gebruiker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {editModalTab === "toegang" && (
              <div
                id="edit-modal-toegang"
                role="tabpanel"
                aria-labelledby="tab-toegang"
                className="space-y-6"
              >
                {editedUser.role === "admin" ? (
                  <p className="text-sm text-muted-foreground">
                    Beheerders hebben toegang tot alle klanten en werknemers.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-card-foreground">
                        Klanten toewijzen
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {selectedClients.length} klanten geselecteerd. Werknemerstoegang wordt apart
                        toegewezen (niet automatisch alle werknemers van een klant).
                      </p>
                      <div className="h-[120px] overflow-hidden rounded-md border border-border">
                        <ScrollArea className="h-full">
                          <div className="flex flex-wrap gap-2 p-2">
                            {selectedClients.map((cid) => {
                              const c = clients.find((cl) => cl.id === cid);
                              if (!c) return null;
                              return (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-primary text-primary-foreground border border-primary"
                                >
                                  {c.name}
                                  <button
                                    type="button"
                                    onClick={() => toggleClientSelection(uid, c.id)}
                                    className="hover:bg-primary-foreground/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
                                    aria-label={`Verwijder ${c.name}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                      <label htmlFor="edit-client-search" className="sr-only">
                        Zoek klant
                      </label>
                      <Input
                        id="edit-client-search"
                        placeholder="Zoek klant…"
                        value={editClientSearch}
                        onChange={(e) => setEditClientSearch(e.target.value)}
                        className="mt-2"
                        aria-label="Zoek klant om toe te voegen"
                      />
                      {editClientSearch.trim() ? (
                        <div className="h-[200px] overflow-hidden rounded-md border border-border mt-2">
                          <ScrollArea className="h-full">
                            <ul className="p-2 space-y-1">
                              {filteredClientsForEdit.length === 0 ? (
                                <li className="text-sm text-muted-foreground py-2">
                                  Geen klanten gevonden
                                </li>
                              ) : (
                                filteredClientsForEdit.map((c) => (
                                  <li key={c.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toggleClientSelection(uid, c.id);
                                        setEditClientSearch("");
                                      }}
                                      className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors"
                                    >
                                      {c.name}
                                    </button>
                                  </li>
                                ))
                              )}
                            </ul>
                          </ScrollArea>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Typ om een klant te zoeken</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold block mb-2 text-card-foreground">
                        Medewerker toevoegen
                      </label>
                      {selectedClients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Selecteer eerst een of meer klanten
                        </p>
                      ) : (
                        <>
                          <label htmlFor="edit-employee-search" className="sr-only">
                            Zoek medewerker
                          </label>
                          <Input
                            id="edit-employee-search"
                            placeholder="Zoek medewerker…"
                            value={editEmployeeSearch}
                            onChange={(e) => setEditEmployeeSearch(e.target.value)}
                            aria-label="Zoek medewerker om toe te voegen"
                          />
                          <div className="h-[180px] overflow-hidden rounded-md border border-border mt-2">
                            <ScrollArea className="h-full">
                              <ul className="p-2 space-y-1">
                                {filteredEmployeesForEdit.length === 0 ? (
                                  <li className="text-sm text-muted-foreground py-2">
                                    {editEmployeeSearch.trim()
                                      ? "Geen medewerkers gevonden"
                                      : "Typ om te zoeken"}
                                  </li>
                                ) : (
                                  filteredEmployeesForEdit.map((e) => (
                                    <li key={e.id}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          addEmployee(uid, e.id);
                                          setEditEmployeeSearch("");
                                        }}
                                        className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors"
                                      >
                                        {e.first_name} {e.last_name}
                                      </button>
                                    </li>
                                  ))
                                )}
                              </ul>
                            </ScrollArea>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold block mb-2 text-card-foreground">
                        Toegewezen werknemers
                      </label>
                      <div className="h-[200px] overflow-hidden rounded-md border border-border">
                        <ScrollArea className="h-full">
                          <ul className="p-2 space-y-2">
                            {(userEmployees[uid] || []).map((eid) => {
                              const emp = employees.find((e) => e.id === eid);
                              if (!emp) return null;
                              return (
                                <li
                                  key={eid}
                                  className="flex justify-between items-center bg-muted px-3 py-2 rounded-md"
                                >
                                  <span className="text-sm text-card-foreground">
                                    {emp.first_name} {emp.last_name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeEmployee(uid, eid)}
                                    className="text-error-600 hover:text-error-700 text-sm font-medium"
                                    aria-label={`Verwijder ${emp.first_name} ${emp.last_name}`}
                                  >
                                    ×
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </ScrollArea>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border shrink-0">
            <Button variant="outline" onClick={guardedCloseEditModal}>
              Annuleren
            </Button>
            <Button onClick={() => void handleSave()}>Opslaan</Button>
          </div>
        </div>
      </div>
    );
  };

  const openPreview = (userId: string, kind: "werkgevers" | "werknemers") => {
    setPreviewUserId(userId);
    setPreviewKind(kind);
  };

  const previewUser = previewUserId ? users.find((u) => u.id === previewUserId) : null;
  const previewWerkgeverNames =
    previewUser && previewKind === "werkgevers"
      ? previewUser.role === "admin"
        ? clients.map((c) => c.name)
        : ((userClients[previewUserId!] || [])
            .map((cid) => clients.find((c) => c.id === cid)?.name)
            .filter(Boolean) as string[])
      : [];
  const previewWerknemerNames =
    previewUser && previewKind === "werknemers"
      ? previewUser.role === "admin"
        ? employees.map((e) => `${e.first_name} ${e.last_name}`)
        : ((userEmployees[previewUserId!] || [])
            .map((eid) => {
              const emp = employees.find((e) => e.id === eid);
              return emp ? `${emp.first_name} ${emp.last_name}` : null;
            })
            .filter(Boolean) as string[])
      : [];

  if (loading) return <p className="text-muted-foreground p-4">Laden...</p>;

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Voornaam</TableHead>
            <TableHead>Achternaam</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Werkgevers</TableHead>
            <TableHead>Werknemers</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const werkgeverCount = u.role === "admin" ? null : (userClients[u.id] || []).length;
            const werknemerCount = u.role === "admin" ? null : (userEmployees[u.id] || []).length;
            const hasWerkgevers = u.role === "admin" || (werkgeverCount ?? 0) > 0;
            const hasWerknemers = u.role === "admin" || (werknemerCount ?? 0) > 0;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>{u.first_name}</TableCell>
                <TableCell>{u.last_name}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {u.role}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {hasWerkgevers ? (
                    <button
                      type="button"
                      onClick={() => openPreview(u.id, "werkgevers")}
                      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    >
                      {u.role === "admin" ? "ALLE" : werkgeverCount}
                    </button>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {hasWerknemers ? (
                    <button
                      type="button"
                      onClick={() => openPreview(u.id, "werknemers")}
                      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    >
                      {u.role === "admin" ? "ALLE" : werknemerCount}
                    </button>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                      Bewerken
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(u.id)}>
                      Verwijderen
                    </Button>
                  </div>
                  {editingId === u.id && renderModal(u)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog
        open={!!previewUserId && !!previewKind}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUserId(null);
            setPreviewKind(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {previewKind === "werkgevers" &&
                previewUser &&
                `Werkgevers – ${previewUser.first_name} ${previewUser.last_name}`}
              {previewKind === "werknemers" &&
                previewUser &&
                `Werknemers – ${previewUser.first_name} ${previewUser.last_name}`}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-60 rounded-md border border-border p-3">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {previewKind === "werkgevers" &&
                previewWerkgeverNames.map((name, i) => <li key={i}>{name}</li>)}
              {previewKind === "werknemers" &&
                previewWerknemerNames.map((name, i) => <li key={i}>{name}</li>)}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
