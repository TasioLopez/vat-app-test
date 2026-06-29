"use client";

import { useCallback, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { SELECT_CLASS } from "@/lib/select-class";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormDirty } from '@/hooks/useFormDirty';
import ModalUnsavedGuard, { useGuardedModalClose } from '@/components/unsaved/ModalUnsavedGuard';

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

export default function UsersTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedUser, setEditedUser] = useState<Partial<User>>({});
    const [userSnapshot, setUserSnapshot] = useState<Partial<User> | null>(null);

    const isModalDirty = useFormDirty(editedUser, userSnapshot);

    const closeEditModal = useCallback(() => {
        setEditingId(null);
        setUserSnapshot(null);
        setEditedUser({});
    }, []);

    const guardedCloseEditModal = useGuardedModalClose(isModalDirty, closeEditModal);

    useEffect(() => {
        const fetchAll = async () => {
            const { data } = await supabase.from("users").select("*");
            if (data) setUsers(data);
            setLoading(false);
        };
        fetchAll();
    }, []);

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setEditedUser(user);
        setUserSnapshot({ ...user });
    };

    const saveUserForGuard = useCallback(async () => {
        if (!editingId) return;

        if (!editedUser.first_name || !editedUser.last_name) {
            throw new Error('Voornaam en achternaam zijn verplicht.');
        }

        if (!editedUser.role || !['admin', 'user'].includes(editedUser.role)) {
            throw new Error('Selecteer een geldige rol.');
        }

        const payload = { ...editedUser };
        if (payload.phone) {
            const parsed = parsePhoneNumberFromString(payload.phone);
            if (!parsed?.isValid()) {
                throw new Error('Voer een geldig telefoonnummer in.');
            }
            payload.phone = parsed.number;
        }

        if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            throw new Error('Voer een geldig e-mailadres in.');
        }

        const { error: userUpdateError } = await supabase
            .from("users")
            .update(payload)
            .eq("id", editingId);

        if (userUpdateError) {
            throw new Error(userUpdateError.message);
        }

        setUsers((prev) =>
            prev.map((u) => (u.id === editingId ? { ...u, ...payload } as User : u))
        );
        setUserSnapshot({ ...payload });
    }, [editedUser, editingId]);

    const handleSave = async (id: string) => {
        try {
            await saveUserForGuard();
            closeEditModal();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Opslaan mislukt');
        }
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

    const renderModal = (user: User) => {
        const uid = user.id;

        return (
            <div className="fixed inset-0 backdrop-blur-sm bg-background/80 z-50 flex items-center justify-center p-4">
                <ModalUnsavedGuard
                    open={editingId === uid}
                    isDirty={isModalDirty}
                    onSave={saveUserForGuard}
                    onClose={closeEditModal}
                />
                <div className="bg-card border border-border p-6 rounded-lg shadow-xl w-[90%] max-w-md max-h-[90vh] flex flex-col">
                    <h2 className="text-2xl font-semibold mb-4 text-card-foreground shrink-0">Gebruiker bewerken</h2>

                    <div className="flex-1 min-h-0 overflow-y-auto max-w-md space-y-4">
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
                            <Select
                                value={editedUser.role || undefined}
                                onValueChange={(v) => handleChange({ target: { name: 'role', value: v } } as React.ChangeEvent<HTMLSelectElement>)}
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

                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border shrink-0">
                        <Button variant="outline" onClick={guardedCloseEditModal}>Annuleren</Button>
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
