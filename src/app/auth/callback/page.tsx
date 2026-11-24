"use client";

/**
 * Client-only auth return URL for invite + password-reset emails (PKCE / hash).
 * Prefer `/auth/confirm?token_hash=…` (server verifyOtp) for email templates —
 * that path does not need a PKCE code_verifier in the same browser.
 *
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include
 * each deployed origin + path, e.g. https://www.vat-app.nl/auth/callback,
 * https://www.vat-app.nl/auth/confirm, https://vat-app.nl/auth/callback (apex redirects to www),
 * and staging equivalents.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSafeAuthRedirectPath } from "@/lib/auth/safe-auth-redirect";
import { humanizeAuthCallbackError } from "@/lib/auth/pkce-errors";
import { tryCreateBrowserSupabase } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"working" | "error">("working");
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const supabase = tryCreateBrowserSupabase();
    if (!supabase) {
      setError("App-configuratie ontbreekt (Supabase). Neem contact op met beheer.");
      setPhase("error");
      return;
    }

    const timeoutId = setTimeout(() => {
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      setError(
        "Ongeldige of verlopen link. Vraag een nieuwe uitnodiging of resetlink aan."
      );
      setPhase("error");
    }, 10000);

    const go = (path: string) => {
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      clearTimeout(timeoutId);
      router.replace(path);
    };

    const fail = (message: string) => {
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      clearTimeout(timeoutId);
      setError(humanizeAuthCallbackError(message));
      setPhase("error");
    };

    const logBranch = (branch: string, details?: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== "production") {
        console.info("[auth/callback]", branch, details ?? {});
      }
    };

    const parseHashTokens = () => {
      const rawHash = window.location.hash?.replace(/^#/, "") ?? "";
      const hash = new URLSearchParams(rawHash);
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      return { accessToken, refreshToken };
    };

    const clearHash = () => {
      const clean = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", clean);
    };

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const nextPath = getSafeAuthRedirectPath(params.get("next"), "/signup");

      // Give createBrowserClient's detectSessionInUrl a short head start so we
      // do not race a second exchangeCodeForSession that already consumed the verifier.
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled || resolvedRef.current) return;

      const {
        data: { session: earlySession },
      } = await supabase.auth.getSession();
      if (earlySession?.user) {
        logBranch("session.early");
        go(nextPath);
        return;
      }

      if (code) {
        logBranch("code.exchange.start");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          logBranch("code.exchange.error", { message: exchangeError.message });
          fail(exchangeError.message || "Sessie kon niet worden gestart.");
          return;
        }
        logBranch("code.exchange.success");
        go(nextPath);
        return;
      }

      const { accessToken, refreshToken } = parseHashTokens();
      if (accessToken && refreshToken) {
        logBranch("hash.setSession.start");
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (!setSessionError) {
          clearHash();
          logBranch("hash.setSession.success");
          go(nextPath);
          return;
        }
        logBranch("hash.setSession.error", { message: setSessionError.message });
      }

      const trySession = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          logBranch("session.detected");
          go(nextPath);
          return true;
        }
        return false;
      };

      await trySession();
      if (cancelled || resolvedRef.current) return;

      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled || resolvedRef.current) return;
        if (
          session?.user &&
          (event === "INITIAL_SESSION" ||
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "PASSWORD_RECOVERY")
        ) {
          go(nextPath);
        }
      });
      subscription = sub;

      for (let i = 0; i < 6 && !resolvedRef.current && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 120 * (i + 1)));
        await trySession();
      }

      if (!cancelled && !resolvedRef.current) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (!userError && user) {
          logBranch("user.fallback.success");
          go(nextPath);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [router]);

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white shadow rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            Naar inloggen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 text-sm text-gray-600 text-center">
        Bezig met doorverwijzen…
      </div>
    </div>
  );
}
