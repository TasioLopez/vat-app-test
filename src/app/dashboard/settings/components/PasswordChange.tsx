"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
            <h2 className="text-xl font-semibold text-foreground mb-6">Wachtwoord Wijzigen</h2>
            
            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    message.type === 'success' 
                        ? 'bg-success-50 text-success-800 border-success-500' 
                        : 'bg-error-50 text-error-800 border-error-500'
                }`}>
                    {message.text}
                </div>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Huidig wachtwoord
                    </label>
                    <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Nieuw wachtwoord
                    </label>
                    <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Voer nieuw wachtwoord in"
                        required
                    />
                    <div className="mt-2">
                        <PasswordStrengthIndicator password={newPassword} />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Bevestig nieuw wachtwoord
                    </label>
                    <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Bevestig nieuw wachtwoord"
                        required
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-sm text-error-600 mt-2">Wachtwoorden komen niet overeen</p>
                    )}
                </div>
                
                <div className="pt-4">
                    <Button 
                        type="submit" 
                        disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    >
                        {saving ? 'Wachtwoord wijzigen...' : 'Wachtwoord wijzigen'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
