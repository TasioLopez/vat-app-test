'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CVGuestPageClient from '@/components/cv/share/CVGuestPageClient';
import type { CvDocumentPayload } from '@/types/cv';

type GuestDocument = {
  id: string;
  employee_id: string;
  title: string;
  template_key: string;
  accent_color: string;
  payload_json: CvDocumentPayload;
  updated_at: string;
};

export default function CvShareGateClient({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docData, setDocData] = useState<{
    document: GuestDocument;
    employeeLabel: string;
    initialPhotoSignedUrl: string | null;
  } | null>(null);

  const loadDocument = useCallback(async () => {
    setLoadingDoc(true);
    setError(null);
    try {
      const res = await fetch(`/api/cv-share/${encodeURIComponent(token)}/document`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'CV laden mislukt');
        setVerified(false);
        return;
      }
      setDocData({
        document: json.document,
        employeeLabel: json.employeeLabel,
        initialPhotoSignedUrl: json.initialPhotoSignedUrl ?? null,
      });
      setVerified(true);
    } catch {
      setError('CV laden mislukt');
      setVerified(false);
    } finally {
      setLoadingDoc(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cv-share/${encodeURIComponent(token)}/verify`);
        const json = await res.json();
        if (!cancelled && json?.verified) {
          await loadDocument();
        }
      } catch {
        /* show gate */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, loadDocument]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/cv-share/${encodeURIComponent(token)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Verificatie mislukt');
        return;
      }
      await loadDocument();
    } catch {
      setError('Verificatie mislukt');
    } finally {
      setVerifying(false);
    }
  };

  if (checking || loadingDoc) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00A3CC]" aria-hidden />
        <span className="sr-only">Laden…</span>
      </div>
    );
  }

  if (verified && docData) {
    return (
      <CVGuestPageClient
        shareToken={token}
        employeeLabel={docData.employeeLabel}
        document={docData.document}
        initialPhotoSignedUrl={docData.initialPhotoSignedUrl}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">CV openen</h1>
        <p className="mt-2 text-sm text-gray-600">
          Voer uw e-mailadres in om het gedeelde CV te bekijken en te bewerken.
        </p>
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-email">E-mailadres</Label>
            <Input
              id="share-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="uw@email.nl"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full bg-[#00A3CC] hover:bg-[#0088aa]" disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bezig…
              </>
            ) : (
              'Doorgaan'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
