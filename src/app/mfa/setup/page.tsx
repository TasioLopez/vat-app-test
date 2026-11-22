"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { tryCreateBrowserSupabase } from "@/lib/supabase/browser";
import { hasVerifiedTotp, isMfaOptionalEmail } from "@/lib/auth/mfa";
import { markSessionAuthenticated } from "@/lib/auth/session-client";

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 focus:border-[var(--color-primary-500)]";

export default function MfaSetupPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = tryCreateBrowserSupabase();
      if (!supabase) {
        setError("App-configuratie ontbreekt.");
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (isMfaOptionalEmail(user.email) || (await hasVerifiedTotp(supabase))) {
        router.replace("/dashboard");
        return;
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Valentinez Assist Tool",
      });
      if (cancelled) return;
      if (enrollError || !data) {
        setError(
          enrollError?.message ||
            "MFA kon niet worden gestart. Schakel TOTP in bij Supabase Auth (Authentication → MFA) en probeer opnieuw."
        );
        setLoading(false);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);
    const supabase = tryCreateBrowserSupabase();
    if (!supabase) {
      setError("App-configuratie ontbreekt.");
      setVerifying(false);
      return;
    }
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setError(challenge.error?.message || "Challenge mislukt.");
      setVerifying(false);
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    if (verified.error) {
      setError("Ongeldige code. Probeer opnieuw.");
      setVerifying(false);
      return;
    }
    markSessionAuthenticated();
    router.replace("/dashboard");
  }

  return (
    <AuthShell>
      <h2 className="text-xl font-semibold text-gray-900">Tweestapsverificatie instellen</h2>
      <p className="mt-2 text-sm text-gray-600">
        Scan de QR-code met Google Authenticator, Microsoft Authenticator of Authy. Voer daarna de
        6-cijferige code in.
      </p>

      {loading ? <p className="mt-8 text-sm text-gray-500">Bezig met laden…</p> : null}
      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      {qr ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="MFA QR-code" className="h-48 w-48" />
          {secret ? (
            <p className="break-all text-center text-xs text-gray-500">
              Handmatige code: <span className="font-mono text-gray-800">{secret}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading && factorId ? (
        <form onSubmit={verify} className="mt-6 space-y-3">
          <input
            className={inputClassName}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-cijferige code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            required
          />
          <Button type="submit" className="w-full" disabled={verifying || code.trim().length < 6}>
            {verifying ? "Controleren…" : "Bevestigen en doorgaan"}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}
