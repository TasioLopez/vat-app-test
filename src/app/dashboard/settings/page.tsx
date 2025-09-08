"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createBrowserClient } from "@supabase/ssr";

export default function SettingsPage() {
    const { data: session } = useSession();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
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
        };

        fetchUser();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Update profile info
        await supabase.from("users").update({
            first_name: firstName,
            last_name: lastName,
        }).eq("id", user.id);

        // Update password (if provided)
        if (password.trim()) {
            await supabase.auth.updateUser({
                password,
            });
        }

        alert("Settings saved!");
    };

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Instellingen</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3 py-2 border rounded bg-gray-100"
                    />
                </div>
                <div>
                    <label className="block mb-1">Voornaam</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div>
                    <label className="block mb-1">Achternaam</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div>
                    <label className="block mb-1">Wachtwoord wijzigen</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                    Wijzigingen opslaan
                </button>
            </form>
        </div>
    );
}
