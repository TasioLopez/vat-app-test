"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SettingsPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    setEmail(user.email ?? "");

                    const { data: userData } = await supabase
                        .from("users")
                        .select("first_name, last_name")
                        .eq("id", user.id)
                        .single();

                    if (userData) {
                        setFirstName(userData.first_name || "");
                        setLastName(userData.last_name || "");
                    }
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het ophalen van gebruikersgegevens.' });
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                setMessage({ type: 'error', text: 'Gebruiker niet gevonden.' });
                return;
            }

            // Update profile info
            const { error: updateError } = await supabase
                .from("users")
                .update({
                    first_name: firstName,
                    last_name: lastName,
                })
                .eq("id", user.id);

            if (updateError) {
                throw updateError;
            }

            // Update password (if provided)
            if (password.trim()) {
                const { error: passwordError } = await supabase.auth.updateUser({
                    password,
                });

                if (passwordError) {
                    throw passwordError;
                }
            }

            setMessage({ type: 'success', text: 'Instellingen succesvol opgeslagen!' });
            setPassword(""); // Clear password field after successful update
        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het opslaan van de instellingen.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-xl mx-auto">
                <div className="text-center">Laden...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Instellingen</h1>
            
            {message && (
                <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 font-medium">Email</label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block mb-1 font-medium">Voornaam</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1 font-medium">Achternaam</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1 font-medium">Wachtwoord wijzigen</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Laat leeg om niet te wijzigen"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        minLength={6}
                    />
                    {password && password.length < 6 && (
                        <p className="text-sm text-red-600 mt-1">Wachtwoord moet minimaal 6 tekens bevatten</p>
                    )}
                </div>
                <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={saving}
                >
                    {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
                </button>
            </form>
        </div>
    );
}
