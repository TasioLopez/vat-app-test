"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import PhoneInput from 'react-phone-input-2';


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
            <div className="fixed inset-0 backdrop-blur-sm bg-white/40 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-md shadow-md w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4">Gebruiker bewerken</h2>

                    <div className="flex flex-col md:flex-row gap-10">
                        {/* Left: User Info */}
                        <div className="flex-1">
                            <input
                                name="first_name"
                                placeholder="Voornaam"
                                value={editedUser.first_name || ""}
                                onChange={handleChange}
                                className="border border-gray-300 rounded px-2 py-1 mb-2 w-full"
                            />
                            <input
                                name="last_name"
                                placeholder="Achternaam"
                                value={editedUser.last_name || ""}
                                onChange={handleChange}
                                className="border border-gray-300 rounded px-2 py-1 mb-2 w-full"
                            />
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={editedUser.email || ""}
                                onChange={handleChange}
                                className="border border-gray-300 rounded px-2 py-1 mb-2 w-full"
                            />
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
                            <select
                                name="role"
                                value={editedUser.role || ""}
                                onChange={handleChange}
                                className="border border-gray-300 rounded px-2 py-1 mb-4 w-full"
                            >
                                <option value="">Selecteer rol...</option>
                                <option value="admin">Beheerder</option>
                                <option value="user">Gebruiker</option>
                            </select>
                        </div>

                        {/* Right: Client/Employee Assignment (Only for non-admins) */}
                        {editedUser.role !== 'admin' && (
                            <div className="flex-1">
                                <label className="font-semibold mb-1 block">Klanten toewijzen</label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {clients.map(c => {
                                        const selected = selectedClients.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => toggleClientSelection(uid, c.id)}
                                                className={`px-3 py-1 text-sm rounded-full border ${selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
                                            >
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>

                                <label className="font-semibold block mb-1">Medewerker toevoegen</label>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) addEmployee(uid, e.target.value);
                                        e.target.value = "";
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 w-full mb-2"
                                >
                                    <option value="">Medewerker selecteren...</option>
                                    {selectableEmployees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.first_name} {e.last_name}
                                        </option>
                                    ))}
                                </select>

                                <label className="font-semibold block mb-1">Toegewezen werknemers</label>
                                <ul className="mb-4 text-sm space-y-1">
                                    {(userEmployees[uid] || []).map(eid => {
                                        const emp = employees.find(e => e.id === eid);
                                        if (!emp) return null;
                                        return (
                                            <li key={eid} className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded">
                                                <span>{emp.first_name} {emp.last_name}</span>
                                                <button onClick={() => removeEmployee(uid, eid)} className="text-red-600 text-xs">✕</button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => handleSave(uid)} className="bg-green-600 text-white px-4 py-2 rounded">Opslaan</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-4 py-2 rounded">Annuleren</button>
                    </div>
                </div>
            </div>
        );
    };


    if (loading) return <p>Laden...</p>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-md">
                <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                        <th className="p-2">Email</th>
                        <th className="p-2">Voornaam</th>
                        <th className="p-2">Achternaam</th>
                        <th className="p-2">Rol</th>
                        <th className="p-2">Werkgevers</th>
                        <th className="p-2">Werknemers</th>
                        <th className="p-2">Acties</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td className="px-2">{u.email}</td>
                            <td className="px-2">{u.first_name}</td>
                            <td className="px-2">{u.last_name}</td>
                            <td className="px-2">{u.role}</td>
                            <td className="px-2">
                                {(userClients[u.id] || [])
                                    .map(cid => clients.find(c => c.id === cid)?.name)
                                    .filter(Boolean)
                                    .join(", ")}
                            </td>
                            <td className="px-2">
                                {(userEmployees[u.id] || [])
                                    .map(eid => {
                                        const emp = employees.find(e => e.id === eid);
                                        return emp ? `${emp.first_name} ${emp.last_name}` : null;
                                    })
                                    .filter(Boolean)
                                    .join(", ")}
                            </td>
                            <td className="px-2 flex flex-col gap-2 py-2">
                                <button onClick={() => handleEdit(u)} className="text-blue-600 rounded hover:bg-blue-700 hover:text-white hover:cursor-pointer hover:font-semibold">Bewerken</button>
                                <button onClick={() => handleDelete(u.id)} className="text-red-600 rounded hover:bg-red-700 hover:text-white hover:cursor-pointer hover:font-semibold">Verwijderen</button>
                                {editingId === u.id && renderModal(u)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
