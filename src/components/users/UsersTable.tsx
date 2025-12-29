"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import PhoneInput from 'react-phone-input-2';
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

export default function UsersTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [userClients, setUserClients] = useState<Record<string, string[]>>({});
    const [userEmployees, setUserEmployees] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedUser, setEditedUser] = useState<Partial<User>>({});

    useEffect(() => {
        const fetchAll = async () => {
            const [userRes, clientRes, employeeRes, userClientRes, empUserRes] = await Promise.all([
                supabase.from("users").select("*"),
                supabase.from("clients").select("*"),
                supabase.from("employees").select("*"),
                supabase.from("user_clients").select("user_id, client_id"),
                supabase.from("employee_users").select("user_id, employee_id")
            ]);

            if (userRes.data) setUsers(userRes.data);
            if (clientRes.data) setClients(clientRes.data);
            if (employeeRes.data) setEmployees(employeeRes.data);

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
        fetchAll();
    }, []);

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setEditedUser(user);
    };

    const handleSave = async (id: string) => {
        // Basic required field checks
        if (!editedUser.first_name || !editedUser.last_name) {
            alert('First name and last name are required.');
            return;
        }

        if (!editedUser.role || !['admin', 'user'].includes(editedUser.role)) {
            alert('Please select a valid role (admin or user).');
            return;
        }

        // Phone validation
        if (editedUser.phone) {
            const parsed = parsePhoneNumberFromString(editedUser.phone);
            if (!parsed?.isValid()) {
                alert('Please enter a valid international phone number.');
                return;
            }
            editedUser.phone = parsed.number; // E.164 format
        }

        // Email validation
        if (!editedUser.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedUser.email)) {
            alert('Please enter a valid email address.');
            return;
        }

        // Save user info
        const { error: userUpdateError } = await supabase
            .from("users")
            .update(editedUser)
            .eq("id", id);

        if (userUpdateError) {
            alert('Error updating user: ' + userUpdateError.message);
            return;
        }

        // Update related client assignments
        await supabase.from("user_clients").delete().eq("user_id", id);
        await Promise.all((userClients[id] || []).map(cid =>
            supabase.from("user_clients").insert({ user_id: id, client_id: cid })
        ));

        // Update related employee assignments
        await supabase.from("employee_users").delete().eq("user_id", id);
        await Promise.all((userEmployees[id] || []).map(eid =>
            supabase.from("employee_users").insert({ user_id: id, employee_id: eid })
        ));

        // Close modal
        setEditingId(null);
    };


    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from("users").delete().eq("id", id);
        if (!error) {
            setUsers((prev) => prev.filter((u) => u.id !== id));
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setEditedUser((prev) => ({ ...prev, [name]: value }));
    };


    const toggleClientSelection = (userId: string, clientId: string) => {
        setUserClients(prev => {
            const current = new Set(prev[userId] || []);
            current.has(clientId) ? current.delete(clientId) : current.add(clientId);
            return { ...prev, [userId]: Array.from(current) };
        });
        // Also clear employees not belonging to any selected client
        setUserEmployees(prev => {
            const filtered = (prev[userId] || []).filter(eid => {
                const emp = employees.find(e => e.id === eid);
                return emp && (userClients[userId] || []).includes(emp.client_id);
            });
            return { ...prev, [userId]: filtered };
        });
    };

    const addEmployee = (userId: string, employeeId: string) => {
        const emp = employees.find(e => e.id === employeeId);
        if (!emp) return;

        setUserEmployees(prev => ({
            ...prev,
            [userId]: [...new Set([...(prev[userId] || []), employeeId])]
        }));
    };

    const removeEmployee = (userId: string, employeeId: string) => {
        setUserEmployees(prev => ({
            ...prev,
            [userId]: (prev[userId] || []).filter(id => id !== employeeId)
        }));
    };

    const renderModal = (user: User) => {
        const uid = user.id;
        const selectedClients = userClients[uid] || [];
        const selectableEmployees = employees.filter(e => selectedClients.includes(e.client_id));

        return (
            <div className="fixed inset-0 backdrop-blur-sm bg-background/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border p-6 rounded-lg shadow-xl w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <h2 className="text-2xl font-semibold mb-6 text-card-foreground">Gebruiker bewerken</h2>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left: User Info */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Voornaam</label>
                                <Input
                                    name="first_name"
                                    placeholder="Voornaam"
                                    value={editedUser.first_name || ""}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Achternaam</label>
                                <Input
                                    name="last_name"
                                    placeholder="Achternaam"
                                    value={editedUser.last_name || ""}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Email</label>
                                <Input
                                    name="email"
                                    type="email"
                                    placeholder="Email"
                                    value={editedUser.email || ""}
                                    onChange={handleChange}
                                />
                            </div>
                            <PhoneInput
                                country={'nl'}
                                value={editedUser.phone || ''}
                                onChange={(value) =>
                                    setEditedUser({ ...editedUser, phone: value.startsWith('+') ? value : '+' + value })
                                }
                                inputProps={{
                                    name: 'phone',
                                    required: false,
                                }}
                                containerStyle={{ marginBottom: '0.75rem', width: '100%' }}
                                inputStyle={{
                                    width: '100%',
                                    height: '40px',
                                    paddingLeft: '48px',
                                    fontSize: '14px',
                                }}
                                buttonStyle={{
                                    border: 'none',
                                    background: 'transparent',
                                }}
                                enableSearch
                            />
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Rol</label>
                                <select
                                    name="role"
                                    value={editedUser.role || ""}
                                    onChange={handleChange}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Selecteer rol...</option>
                                    <option value="admin">Beheerder</option>
                                    <option value="user">Gebruiker</option>
                                </select>
                            </div>
                        </div>

                        {/* Right: Client/Employee Assignment (Only for non-admins) */}
                        {editedUser.role !== 'admin' && (
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block text-card-foreground">Klanten toewijzen</label>
                                    <div className="flex flex-wrap gap-2">
                                        {clients.map(c => {
                                            const selected = selectedClients.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    onClick={() => toggleClientSelection(uid, c.id)}
                                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                                                        selected 
                                                            ? "bg-primary text-primary-foreground border-primary" 
                                                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                                                    }`}
                                                >
                                                    {c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold block mb-2 text-card-foreground">Medewerker toevoegen</label>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) addEmployee(uid, e.target.value);
                                            e.target.value = "";
                                        }}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Medewerker selecteren...</option>
                                        {selectableEmployees.map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.first_name} {e.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold block mb-2 text-card-foreground">Toegewezen werknemers</label>
                                    <ul className="space-y-2">
                                        {(userEmployees[uid] || []).map(eid => {
                                            const emp = employees.find(e => e.id === eid);
                                            if (!emp) return null;
                                            return (
                                                <li key={eid} className="flex justify-between items-center bg-muted px-3 py-2 rounded-md">
                                                    <span className="text-sm text-card-foreground">{emp.first_name} {emp.last_name}</span>
                                                    <button onClick={() => removeEmployee(uid, eid)} className="text-error-600 hover:text-error-700 text-sm font-medium">✕</button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
                        <Button variant="outline" onClick={() => setEditingId(null)}>Annuleren</Button>
                        <Button onClick={() => handleSave(uid)}>Opslaan</Button>
                    </div>
                </div>
            </div>
        );
    };


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
                    {users.map((u) => (
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
                                {(userClients[u.id] || [])
                                    .map(cid => clients.find(c => c.id === cid)?.name)
                                    .filter(Boolean)
                                    .join(", ") || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {(userEmployees[u.id] || [])
                                    .map(eid => {
                                        const emp = employees.find(e => e.id === eid);
                                        return emp ? `${emp.first_name} ${emp.last_name}` : null;
                                    })
                                    .filter(Boolean)
                                    .join(", ") || "—"}
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>Bewerken</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(u.id)}>Verwijderen</Button>
                                </div>
                                {editingId === u.id && renderModal(u)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
