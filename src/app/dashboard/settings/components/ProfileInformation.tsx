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
        <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Profiel Informatie</h2>
            
            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    message.type === 'success' 
                        ? 'bg-success-50 text-success-800 border-success-500' 
                        : 'bg-error-50 text-error-800 border-error-500'
                }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Email
                    </label>
                    <Input
                        type="email"
                        value={email}
                        disabled
                        className="bg-muted cursor-not-allowed"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                    >
                        {saving ? 'Opslaan...' : 'Profiel opslaan'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
