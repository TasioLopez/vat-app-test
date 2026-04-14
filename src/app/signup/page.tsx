// src/app/signup/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const resolvedRef = useRef(false);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  useEffect(() => {
    const applyUser = (user: User) => {
      resolvedRef.current = true;
      setError("");
      setEmail(user.email ?? "");
      const metaFirst =
        typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : "";
      const metaLast =
        typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : "";
      setFirstName(metaFirst);
      setLastName(metaLast);
      setCheckingSession(false);
    };

    const tryHydrateFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        applyUser(session.user);
        return true;
      }
      return false;
    };

    let timeoutId: ReturnType<typeof setTimeout>;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.user &&
        (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        applyUser(session.user);
      }
    });

    const run = async () => {
      try {
        await tryHydrateFromSession();

        for (let i = 0; i < 6 && !resolvedRef.current; i++) {
          await new Promise((r) => setTimeout(r, 120 * (i + 1)));
          await tryHydrateFromSession();
        }

        if (!resolvedRef.current) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (!userError && user) {
            applyUser(user);
          }
        }
      } catch {
        // Let onAuthStateChange or the timeout below surface a clear error.
      }
    };

    void run();

    timeoutId = setTimeout(() => {
      if (!resolvedRef.current) {
        setError("Ongeldige of verlopen aanmeldlink.");
        setCheckingSession(false);
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [supabase]);

  const handleSignup = async () => {
    setError("");
    setLoading(true);

    if (!email) {
      setError("Ongeldige of verlopen aanmeldlink.");
      setLoading(false);
      return;
    }

    const validation = validateForm(
      passwordValidation.resetPassword,
      { newPassword: password, confirmPassword }
    );

    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0];
      setError(firstError || 'Wachtwoord validatiefout');
      setLoading(false);
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError(passwordError.message || "Wachtwoord kon niet worden ingesteld.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/signup/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ firstName, lastName }),
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Er is iets misgegaan. Probeer het opnieuw.");
    } else {
      router.push("/dashboard");
    }

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white shadow rounded-lg p-6 text-sm text-gray-600">
          Laden...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Voltooi uw aanmelding</h1>
        <p className="text-sm mb-6 text-gray-600">Email: {email || "—"}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voornaam
            </label>
            <input
              type="text"
              placeholder="Voornaam"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Achternaam
            </label>
            <input
              type="text"
              placeholder="Achternaam"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wachtwoord
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Voer wachtwoord in"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bevestig wachtwoord
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Bevestig wachtwoord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-600 mt-1">Wachtwoorden komen niet overeen</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleSignup}
          disabled={checkingSession || loading || !password || !confirmPassword || password !== confirmPassword}
          className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Account aanmaken...' : 'Account Aanmaken'}
        </button>
      </div>
    </div>
  );
}
