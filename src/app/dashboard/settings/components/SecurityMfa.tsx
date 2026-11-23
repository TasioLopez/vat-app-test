'use client';

import { useCallback, useEffect, useState } from 'react';
import { tryCreateBrowserSupabase } from '@/lib/supabase/browser';
import { listVerifiedTotpFactors, type TotpFactor } from '@/lib/auth/mfa';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SecurityMfa() {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [unenrollId, setUnenrollId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = tryCreateBrowserSupabase();
    if (!supabase) return;
    const list = await listVerifiedTotpFactors(supabase);
    setFactors(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function unenroll() {
    if (!unenrollId) return;
    setBusy(true);
    setMessage(null);
    const supabase = tryCreateBrowserSupabase();
    if (!supabase) {
      setMessage({ type: 'error', text: 'App-configuratie ontbreekt.' });
      setBusy(false);
      return;
    }

    const challenge = await supabase.auth.mfa.challenge({ factorId: unenrollId });
    if (challenge.error || !challenge.data) {
      setMessage({ type: 'error', text: challenge.error?.message || 'Bevestiging mislukt.' });
      setBusy(false);
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId: unenrollId,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    if (verified.error) {
      setMessage({ type: 'error', text: 'Ongeldige authenticator-code.' });
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId: unenrollId });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setBusy(false);
      return;
    }
    setMessage({
      type: 'success',
      text: 'Factor verwijderd. Je wordt doorgestuurd om MFA opnieuw in te stellen.',
    });
    setUnenrollId(null);
    setCode('');
    setBusy(false);
    window.location.href = '/mfa/setup';
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Beveiliging (MFA)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tweestapsverificatie met een authenticator-app is verplicht voor alle gebruikers.
        </p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Laden…</p> : null}
      {message ? (
        <div
          className={`rounded px-3 py-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {!loading && factors.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-amber-800">Er is nog geen MFA-factor actief.</p>
          <Button type="button" onClick={() => (window.location.href = '/mfa/setup')}>
            MFA instellen
          </Button>
        </div>
      ) : null}

      {factors.map((f) => (
        <div
          key={f.id}
          className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-slate-800">{f.friendly_name || 'Authenticator-app'}</p>
            <p className="text-xs text-slate-500">Status: {f.status}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setUnenrollId(f.id)}>
            Verwijderen
          </Button>
        </div>
      ))}

      {unenrollId ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Voer de huidige code uit je authenticator-app in om deze factor te verwijderen. Daarna
            moet je MFA opnieuw instellen.
          </p>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-cijferige code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setUnenrollId(null)}>
              Annuleren
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || code.trim().length < 6}
              onClick={() => void unenroll()}
            >
              {busy ? 'Bezig…' : 'Verwijderen'}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
