'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { signStorageUrl } from '@/lib/documents/sign-storage-url';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  storagePath: string | null;
};

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

function extensionFromPath(path: string | null | undefined): string {
  if (!path) return '';
  const clean = path.split('?')[0]?.split('#')[0] ?? path;
  const base = clean.split('/').pop() ?? clean;
  const dot = base.lastIndexOf('.');
  if (dot < 0) return '';
  return base.slice(dot + 1).toLowerCase();
}

function resolveExt(storagePath: string | null, title: string): string {
  return extensionFromPath(storagePath) || extensionFromPath(title);
}

export function DocumentPreviewDialog({ open, onOpenChange, title, storagePath }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ext = useMemo(() => resolveExt(storagePath, title), [storagePath, title]);
  const isPdf = ext === 'pdf';
  const isImage = IMAGE_EXT.has(ext);
  const embeddable = isPdf || isImage;

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

    const fileExt = resolveExt(storagePath, title);

    void signStorageUrl(storagePath)
      .then((url) => {
        if (cancelled) return;
        setSignedUrl(url);
        if (fileExt !== 'pdf' && !IMAGE_EXT.has(fileExt)) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
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
  }, [open, storagePath, title]);

  const openInNewTab = () => {
    if (!signedUrl) return;
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="space-y-0 border-b border-border px-4 py-3 pr-12 text-left">
          <div className="flex items-center gap-3">
            <DialogTitle className="min-w-0 flex-1 truncate text-base">{title}</DialogTitle>
            {signedUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={openInNewTab}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Openen in nieuw tabblad
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-muted/30">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Voorbeeld laden…
            </div>
          ) : null}
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-red-600">Kon voorbeeld niet laden. {error}</p>
            </div>
          ) : null}
          {!loading && !error && signedUrl && isPdf ? (
            <object
              data={`${signedUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              type="application/pdf"
              className="h-full w-full"
            >
              <iframe src={signedUrl} className="h-full w-full" title={`Voorbeeld: ${title}`} />
            </object>
          ) : null}
          {!loading && !error && signedUrl && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={title}
              className="mx-auto h-full max-h-full w-auto max-w-full object-contain p-4"
            />
          ) : null}
          {!loading && !error && signedUrl && !embeddable ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Dit bestandstype kan niet in de browser worden getoond. Het is geopend in een nieuw
                tabblad (of gebruik de knop hierboven).
              </p>
              <Button type="button" variant="secondary" onClick={openInNewTab}>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Openen in nieuw tabblad
              </Button>
            </div>
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
