"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { validateForm, authValidation } from "@/lib/validation";
import { getConfiguredClientAuthOrigin, normalizeAuthOrigin } from "@/lib/auth/auth-origin";
import { tryCreateBrowserSupabase } from "@/lib/supabase/browser";
import { isMfaOptionalEmail, listVerifiedTotpFactors } from "@/lib/auth/mfa";
import { markSessionAuthenticated } from "@/lib/auth/session-client";

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 focus:border-[var(--color-primary-500)]";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function finishLoginRedirect() {
    markSessionAuthenticated();
    const next = searchParams.get("redirect");
    router.push(next && next.startsWith("/") ? next : "/dashboard");
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const supabase = tryCreateBrowserSupabase();
    if (!supabase) {
      setLoginError("App-configuratie ontbreekt (Supabase).");
      setLoginLoading(false);
      return;
    }

    const {
      data: authData,
      error: loginErr,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (loginErr || !authData.session?.user) {
      setLoginError("Ongeldige inloggegevens.");
      setLoginLoading(false);
      return;
    }

    const userId = authData.session.user.id;

    if (!userId || typeof userId !== "string") {
      setLoginError("Er ging iets mis. Probeer het opnieuw.");
      await supabase.auth.signOut();
      setLoginLoading(false);
      return;
    }

    const { data: userRecord, error: fetchError } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", userId.trim())
      .maybeSingle();

    if (fetchError) {
      setLoginError("Er ging iets mis tijdens de verificatie.");
      await supabase.auth.signOut();
      setLoginLoading(false);
      return;
    }

    if (!userRecord) {
      setLoginError("Geen toegang: account niet geautoriseerd.");
      await supabase.auth.signOut();
      setLoginLoading(false);
      return;
    }

    if (userRecord.status !== "confirmed") {
      setLoginError("Account nog niet bevestigd. Neem contact op met de beheerder.");
      await supabase.auth.signOut();
      setLoginLoading(false);
      return;
    }

    // Staging/test bots listed in MFA_OPTIONAL_EMAILS skip enroll + TOTP challenge.
    if (isMfaOptionalEmail(authData.session.user.email)) {
      await finishLoginRedirect();
      return;
    }

    const totpFactors = await listVerifiedTotpFactors(supabase);
    if (totpFactors.length > 0) {
      setMfaFactorId(totpFactors[0].id);
      setMfaCode("");
      setMfaError(null);
      setLoginLoading(false);
      return;
    }

    router.push("/mfa/setup");
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    setMfaLoading(true);
    setMfaError(null);
    const supabase = tryCreateBrowserSupabase();
    if (!supabase) {
      setMfaError("App-configuratie ontbreekt.");
      setMfaLoading(false);
      return;
    }
    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challenge.error || !challenge.data) {
      setMfaError(challenge.error?.message || "Challenge mislukt.");
      setMfaLoading(false);
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.data.id,
      code: mfaCode.trim(),
    });
    if (verified.error) {
      setMfaError("Ongeldige code. Probeer opnieuw.");
      setMfaLoading(false);
      return;
    }
    await finishLoginRedirect();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);

    try {
      const supabase = tryCreateBrowserSupabase();
      if (!supabase) {
        setResetMessage({ type: "error", text: "App-configuratie ontbreekt (Supabase)." });
        setResetLoading(false);
        return;
      }

      const validation = validateForm(authValidation.forgotPassword, { email: resetEmail });
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        setResetMessage({ type: "error", text: firstError || "Ongeldig e-mailadres" });
        setResetLoading(false);
        return;
      }

      const emailNorm = resetEmail.trim().toLowerCase();
      const authOrigin =
        getConfiguredClientAuthOrigin() ?? normalizeAuthOrigin(window.location.origin);
      const callbackUrl = new URL("/auth/callback", authOrigin);
      callbackUrl.searchParams.set("next", "/reset-password");

      const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
        redirectTo: callbackUrl.toString(),
      });

      if (error) {
        console.error("Supabase password reset error:", error);
        let errorMessage = "Er is een fout opgetreden bij het verzenden van de reset link.";
        if (error.message.includes("redirect_to")) {
          errorMessage =
            "De redirect URL is niet geconfigureerd in Supabase. Neem contact op met de beheerder.";
        } else if (error.message.includes("email")) {
          errorMessage = "Er is een probleem met het e-mailadres. Controleer of het correct is.";
        } else if (error.message.includes("rate limit") || error.message.includes("too many")) {
          errorMessage = "Te veel verzoeken. Wacht even en probeer het later opnieuw.";
        } else {
          errorMessage = `Fout: ${error.message}`;
        }
        setResetMessage({ type: "error", text: errorMessage });
        setResetLoading(false);
        return;
      }

      setResetMessage({
        type: "success",
        text: "Als dit e-mailadres bij ons bekend is, ontvang je een link om je wachtwoord te resetten. Controleer je inbox en spam.",
      });
      setResetEmail("");
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage(null);
      }, 5000);
    } catch (error: unknown) {
      console.error("Unexpected error sending reset email:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Er is een onverwachte fout opgetreden. Probeer het later opnieuw of neem contact op met de beheerder.";
      setResetMessage({ type: "error", text: message });
    } finally {
      setResetLoading(false);
    }
  };

  const reasonMessage =
    reason === "idle_timeout"
      ? "Je bent uitgelogd door inactiviteit."
      : reason === "session_expired"
        ? "Je sessie is verlopen. Log opnieuw in."
        : null;

  return (
    <>
      <AuthShell
        banner={
          reasonMessage ? (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {reasonMessage}
            </div>
          ) : null
        }
      >
        {mfaFactorId ? (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <h2 className="text-center text-xl font-medium text-gray-900">Tweestapsverificatie</h2>
            <p className="text-center text-sm text-gray-600">
              Voer de 6-cijferige code uit je authenticator-app in.
            </p>
            {mfaError ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{mfaError}</div>
            ) : null}
            <input
              className={`${inputClassName} tracking-widest`}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              maxLength={8}
              required
            />
            <Button type="submit" className="w-full" disabled={mfaLoading}>
              {mfaLoading ? "Controleren…" : "Bevestigen"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={async () => {
                const supabase = tryCreateBrowserSupabase();
                await supabase?.auth.signOut();
                setMfaFactorId(null);
                setMfaCode("");
              }}
            >
              Annuleren
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-center text-xl font-medium text-gray-900">Inloggen</h2>

            {loginError ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{loginError}</div>
            ) : null}

            <input
              className={inputClassName}
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className={inputClassName}
              type="password"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? "Bezig…" : "Inloggen"}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setShowForgotPassword(true)}
            >
              Wachtwoord vergeten?
            </Button>
          </form>
        )}
      </AuthShell>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-100/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Wachtwoord Resetten</h3>

            {resetMessage && (
              <div
                className={`mb-4 rounded-lg p-3 text-sm ${
                  resetMessage.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">E-mailadres</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={inputClassName}
                  placeholder="Voer je e-mailadres in"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetMessage(null);
                    setResetEmail("");
                  }}
                >
                  Annuleren
                </Button>
                <Button type="submit" className="flex-1" disabled={resetLoading}>
                  {resetLoading ? "Verzenden..." : "Reset Link Verzenden"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
