"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Profiel Informatie</h2>
                <p className="text-gray-600">Beheer uw persoonlijke gegevens</p>
            </div>
            
            {message && (
                <div className={`p-4 rounded-xl border-2 shadow-md ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border-green-300' 
                        : 'bg-red-50 text-red-800 border-red-300'
                }`}>
                    {message.text}
                </div>
            )}

            <Card className="p-8">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email
                        </label>
                        <Input
                            type="email"
                            value={email}
                            disabled
                            className="bg-gray-100 cursor-not-allowed"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Voornaam
                        </label>
                        <Input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Achternaam
                        </label>
                        <Input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={saving}
                            size="lg"
                        >
                            {saving ? 'Opslaan...' : 'Profiel opslaan'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
