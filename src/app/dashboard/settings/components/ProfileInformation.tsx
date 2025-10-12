"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ProfileInformation() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
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

    const handleProfileSubmit = async (e: React.FormEvent) => {
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

            setMessage({ type: 'success', text: 'Profiel succesvol opgeslagen!' });
        } catch (error) {
            console.error("Error saving profile:", error);
            setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het opslaan van het profiel.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">Laden...</div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profiel Informatie</h2>
            
            {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-500"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voornaam
                    </label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Achternaam
                    </label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>
                
                <div className="pt-4">
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        disabled={saving}
                    >
                        {saving ? 'Opslaan...' : 'Profiel opslaan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
