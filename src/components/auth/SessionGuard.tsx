'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tryCreateBrowserSupabase } from '@/lib/supabase/browser';
import {
  clearSessionPolicyCookies,
  evaluateSessionExpiry,
  markSessionAuthenticated,
  touchSessionActivity,
} from '@/lib/auth/session-client';

/**
 * Enforces 60 min idle + 12 h absolute session for dashboard users.
 * Mount only inside authenticated dashboard shell.
 */
export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);

  const logout = useCallback(
    async (reason: string) => {
      clearSessionPolicyCookies();
      const supabase = tryCreateBrowserSupabase();
      await supabase?.auth.signOut();
      router.replace(`/login?reason=${encodeURIComponent(reason)}`);
    },
    [router]
  );

  useEffect(() => {
    // Migrate existing sessions that logged in before cookies existed.
    const state = evaluateSessionExpiry();
    if (!state.ok && state.reason === 'missing') {
      markSessionAuthenticated();
    }

    const onActivity = () => {
      touchSessionActivity();
      setWarning(null);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'] as const;
    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    const tick = () => {
      const next = evaluateSessionExpiry();
      if (!next.ok) {
        void logout(next.reason === 'absolute' ? 'session_expired' : 'idle_timeout');
        return;
      }
      if (next.msUntilIdleLogout <= 2 * 60 * 1000) {
        const mins = Math.max(1, Math.ceil(next.msUntilIdleLogout / 60000));
        setWarning(
          `Je wordt over ${mins} min. uitgelogd door inactiviteit. Beweeg de muis of typ om ingelogd te blijven.`
        );
      } else {
        setWarning(null);
      }
    };

    tick();
    const id = window.setInterval(tick, 15_000);
    return () => {
      window.clearInterval(id);
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [logout]);

  return (
    <>
      {warning ? (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
          {warning}
        </div>
      ) : null}
      {children}
    </>
  );
}
