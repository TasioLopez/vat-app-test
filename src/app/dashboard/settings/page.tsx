"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation, type ChangePasswordFormData } from "@/lib/validation";

export default function SettingsPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    
    // Password change state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordSaving(true);
        setPasswordMessage(null);

        try {
            // Validate password change form
            const validation = validateForm(
                passwordValidation.changePassword,
                { currentPassword, newPassword, confirmPassword }
            );

            if (!validation.success) {
                const firstError = Object.values(validation.errors || {})[0];
                setPasswordMessage({ type: 'error', text: firstError || 'Validatiefout' });
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                setPasswordMessage({ type: 'error', text: 'Gebruiker niet gevonden.' });
                return;
            }

            // Verify current password by attempting to sign in
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: currentPassword,
            });

            if (verifyError) {
                setPasswordMessage({ type: 'error', text: 'Huidig wachtwoord is onjuist.' });
                return;
            }

            // Update password
            const { error: passwordError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (passwordError) {
                throw passwordError;
            }

            setPasswordMessage({ type: 'success', text: 'Wachtwoord succesvol gewijzigd!' });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Error changing password:", error);
            setPasswordMessage({ type: 'error', text: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.' });
        } finally {
            setPasswordSaving(false);
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

            {/* Profile Information Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Profiel Informatie</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
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
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={saving}
                    >
                        {saving ? 'Opslaan...' : 'Profiel opslaan'}
                    </button>
                </form>
            </div>

            {/* Password Change Section */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Wachtwoord Wijzigen</h2>
                {passwordMessage && (
                    <div className={`mb-4 p-3 rounded ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {passwordMessage.text}
                    </div>
                )}
                
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">Huidig wachtwoord</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block mb-1 font-medium">Nieuw wachtwoord</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Voer nieuw wachtwoord in"
                            required
                        />
                        <PasswordStrengthIndicator password={newPassword} />
                    </div>
                    
                    <div>
                        <label className="block mb-1 font-medium">Bevestig nieuw wachtwoord</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Bevestig nieuw wachtwoord"
                            required
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-sm text-red-600 mt-1">Wachtwoorden komen niet overeen</p>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    >
                        {passwordSaving ? 'Wachtwoord wijzigen...' : 'Wachtwoord wijzigen'}
                    </button>
                </form>
            </div>
        </div>
    );
}
