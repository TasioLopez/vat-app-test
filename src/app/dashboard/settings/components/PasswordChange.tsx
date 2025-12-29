"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

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
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Wachtwoord Wijzigen</h2>
                <p className="text-gray-600">Update uw wachtwoord voor beveiliging</p>
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
                <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nieuw wachtwoord
                        </label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Voer nieuw wachtwoord in"
                            required
                        />
                        <div className="mt-3">
                            <PasswordStrengthIndicator password={newPassword} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                            <p className="text-sm text-red-600 mt-2 font-medium">Wachtwoorden komen niet overeen</p>
                        )}
                    </div>
                    
                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            size="lg"
                        >
                            {saving ? 'Wachtwoord wijzigen...' : 'Wachtwoord wijzigen'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
