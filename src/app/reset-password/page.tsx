"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";
import { tryCreateBrowserSupabase } from "@/lib/supabase/browser";

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 focus:border-[var(--color-primary-500)]";

function ResetPasswordContent() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    const supabase = tryCreateBrowserSupabase();
    supabaseRef.current = supabase;
    if (!supabase) {
      setMessage({
        type: "error",
        text: "App-configuratie ontbreekt (Supabase).",
      });
      setIsValidSession(false);
      setCheckingSession(false);
      return;
    }

    const checkSession = async () => {
      try {
        await supabase.auth.getSession();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          setMessage({
            type: "error",
            text: "Ongeldige of verlopen reset link. Vraag een nieuwe reset link aan.",
          });
          setIsValidSession(false);
        } else {
          setIsValidSession(true);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setMessage({
          type: "error",
          text: "Er is een fout opgetreden. Probeer het opnieuw.",
        });
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    void checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = supabaseRef.current ?? tryCreateBrowserSupabase();
      if (!supabase) {
        setMessage({ type: "error", text: "App-configuratie ontbreekt (Supabase)." });
        return;
      }

      const validation = validateForm(passwordValidation.resetPassword, {
        newPassword,
        confirmPassword,
      });

      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        setMessage({ type: "error", text: firstError || "Validatiefout" });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text: "Wachtwoord succesvol gewijzigd! Je wordt doorgestuurd naar de login pagina.",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage({
        type: "error",
        text: "Er is een fout opgetreden bij het resetten van het wachtwoord.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--color-primary-500)]" />
          <p className="text-sm text-gray-600">Controleer reset link...</p>
        </div>
      </AuthShell>
    );
  }

  if (!isValidSession) {
    return (
      <AuthShell>
        <h2 className="text-center text-xl font-medium text-gray-900">Wachtwoord Reset</h2>

        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <Button onClick={() => router.push("/login")} className="mt-6 w-full">
          Terug naar Login
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {message && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        <h2 className="text-center text-xl font-medium text-gray-900">Nieuw Wachtwoord</h2>
        <p className="text-center text-sm text-gray-600">
          Voer een nieuw sterk wachtwoord in voor je account
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nieuw wachtwoord</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClassName}
            placeholder="Voer nieuw wachtwoord in"
            required
          />
          <PasswordStrengthIndicator password={newPassword} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bevestig nieuw wachtwoord
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClassName}
            placeholder="Bevestig nieuw wachtwoord"
            required
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-sm text-red-600">Wachtwoorden komen niet overeen</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
        >
          {loading ? "Wachtwoord opslaan..." : "Wachtwoord Opslaan"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Button variant="link" onClick={() => router.push("/login")}>
          Terug naar Login
        </Button>
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--color-primary-500)]" />
            <p className="text-sm text-gray-600">Laden...</p>
          </div>
        </AuthShell>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
