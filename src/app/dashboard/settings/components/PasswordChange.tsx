"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";

export default function PasswordChange() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Password change state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Validate password change form
            const validation = validateForm(
                passwordValidation.changePassword,
                { currentPassword, newPassword, confirmPassword }
            );

            if (!validation.success) {
                const firstError = Object.values(validation.errors || {})[0];
                setMessage({ type: 'error', text: firstError || 'Validatiefout' });
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                setMessage({ type: 'error', text: 'Gebruiker niet gevonden.' });
                return;
            }

            // Verify current password by attempting to sign in
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: currentPassword,
            });

            if (verifyError) {
                setMessage({ type: 'error', text: 'Huidig wachtwoord is onjuist.' });
                return;
            }

            // Update password
            const { error: passwordError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (passwordError) {
                throw passwordError;
            }

            setMessage({ type: 'success', text: 'Wachtwoord succesvol gewijzigd!' });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Error changing password:", error);
            setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Wachtwoord Wijzigen</h2>
            
            {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                    message.type === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Huidig wachtwoord
                    </label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nieuw wachtwoord
                    </label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Voer nieuw wachtwoord in"
                        required
                    />
                    <div className="mt-2">
                        <PasswordStrengthIndicator password={newPassword} />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bevestig nieuw wachtwoord
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Bevestig nieuw wachtwoord"
                        required
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-sm text-red-600 mt-2">Wachtwoorden komen niet overeen</p>
                    )}
                </div>
                
                <div className="pt-4">
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    >
                        {saving ? 'Wachtwoord wijzigen...' : 'Wachtwoord wijzigen'}
                    </button>
                </div>
            </form>
        </div>
    );
}
