'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { signStorageUrl } from '@/lib/documents/sign-storage-url';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  storagePath: string | null;
};

export function DocumentPreviewDialog({ open, onOpenChange, title, storagePath }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !storagePath) {
      setSignedUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSignedUrl(null);

    void signStorageUrl(storagePath)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Voorbeeld laden mislukt');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, storagePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-0 border-b border-border px-4 py-3 pr-12 text-left">
          <DialogTitle className="truncate text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-muted/30">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Voorbeeld laden…
            </div>
          ) : null}
          {error ? (
            <div className="p-4 text-sm text-red-600">Kon voorbeeld niet laden. {error}</div>
          ) : null}
          {!loading && !error && signedUrl ? (
            <iframe
              src={signedUrl}
              className="h-full w-full"
              title={`Voorbeeld: ${title}`}
            />
          ) : null}
          {!loading && !error && !signedUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Geen voorbeeld beschikbaar.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
