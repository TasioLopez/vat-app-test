'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  cvId: string;
  employeeLabel: string;
  recipientEmail: string | null;
  isDirty: boolean;
  onSaveFirst?: () => Promise<void>;
  onShared?: () => void;
};

export default function CvShareModal({
  open,
  onOpenChange,
  employeeId,
  cvId,
  employeeLabel,
  recipientEmail,
  isDirty,
  onSaveFirst,
  onShared,
}: Props) {
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const handleShare = async () => {
    if (!recipientEmail || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      if (isDirty && onSaveFirst) {
        await onSaveFirst();
      }
      const res = await fetch('/api/cv-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, cvId, message: message.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Delen mislukt');
        return;
      }
      setShareUrl(json.shareUrl);
      setExpiresAt(json.expiresAt);
      onShared?.();
    } catch {
      setError('Delen mislukt');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setMessage('');
      setConfirmed(false);
      setError(null);
      setShareUrl(null);
      setExpiresAt(null);
    }
    onOpenChange(next);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  };

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>CV delen met werknemer</DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700">
              Het CV is gedeeld en er is een e-mail verstuurd naar {recipientEmail}.
            </p>
            {expiryLabel ? (
              <p className="text-xs text-gray-500">De link is geldig tot {expiryLabel}.</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="share-url-copy">Link (kopieer indien nodig)</Label>
              <div className="flex gap-2">
                <Input id="share-url-copy" readOnly value={shareUrl} className="text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                  Kopiëren
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleClose(false)}>
                Sluiten
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {!recipientEmail ? (
              <p className="text-sm text-red-600">
                Deze werknemer heeft geen e-mailadres. Voeg een e-mailadres toe aan het
                werknemerprofiel voordat u deelt.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md bg-gray-50 p-3 text-sm">
                  <p>
                    <span className="font-medium">Werknemer:</span> {employeeLabel}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">E-mail:</span> {recipientEmail}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-message">Optioneel bericht</Label>
                  <Textarea
                    id="share-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Voeg een kort bericht toe voor de werknemer…"
                    rows={3}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  De werknemer ontvangt een link die 30 dagen geldig is. Wijzigingen worden
                  direct opgeslagen in dit CV.
                </p>
                <div className="flex items-start gap-2">
                  <input
                    id="share-confirm"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <Label htmlFor="share-confirm" className="text-sm font-normal leading-snug">
                    Ik bevestig dat de werknemer dit e-mailadres gebruikt
                  </Label>
                </div>
                {error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Annuleren
              </Button>
              <Button
                type="button"
                className="bg-[#00A3CC] hover:bg-[#0088aa]"
                disabled={!recipientEmail || !confirmed || busy}
                onClick={handleShare}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Versturen…
                  </>
                ) : (
                  'Delen en e-mail versturen'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
