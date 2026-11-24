"use client";

import { useState } from "react";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function PasswordChange() {
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
            const validation = validateForm(
                passwordValidation.changePassword,
                { currentPassword, newPassword, confirmPassword }
            );

            if (!validation.success) {
                const firstError = Object.values(validation.errors || {})[0];
                setMessage({ type: 'error', text: firstError || 'Validatiefout' });
                return;
            }

            // Server verifies current password on an ephemeral client so we do
            // not call signInWithPassword in the browser (that would drop MFA AAL2).
            const res = await fetch("/api/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const payload = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                setMessage({
                    type: "error",
                    text: payload.error || "Er is een fout opgetreden bij het wijzigen van het wachtwoord.",
                });
                return;
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
                            autoComplete="current-password"
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
                            autoComplete="new-password"
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
                            autoComplete="new-password"
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
