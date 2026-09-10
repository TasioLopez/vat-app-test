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
const WORD_EXT = new Set(['docx', 'doc']);

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

function buildDocxSrcDoc(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 15px;
    line-height: 1.5;
    padding: 24px 28px;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  td, th { border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
  p { margin: 0 0 0.75em; }
  h1, h2, h3, h4 { margin: 1em 0 0.5em; line-height: 1.25; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export function DocumentPreviewDialog({ open, onOpenChange, title, storagePath }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [docxSrcDoc, setDocxSrcDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ext = useMemo(() => resolveExt(storagePath, title), [storagePath, title]);
  const isPdf = ext === 'pdf';
  const isImage = IMAGE_EXT.has(ext);
  const isWord = WORD_EXT.has(ext);
  const isOther = !isPdf && !isImage && !isWord;

  useEffect(() => {
    if (!open || !storagePath) {
      setSignedUrl(null);
      setDocxSrcDoc(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSignedUrl(null);
    setDocxSrcDoc(null);

    const fileExt = resolveExt(storagePath, title);

    void (async () => {
      try {
        const url = await signStorageUrl(storagePath);
        if (cancelled) return;
        setSignedUrl(url);

        if (WORD_EXT.has(fileExt)) {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Bestand ophalen mislukt (${res.status})`);
          }
          const arrayBuffer = await res.arrayBuffer();
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (cancelled) return;
          setDocxSrcDoc(buildDocxSrcDoc(result.value || '<p><em>Leeg document.</em></p>'));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Voorbeeld laden mislukt');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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
              {signedUrl ? (
                <Button type="button" variant="secondary" onClick={openInNewTab}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Openen in nieuw tabblad
                </Button>
              ) : null}
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
          {!loading && !error && isWord && docxSrcDoc ? (
            <iframe
              title={`Voorbeeld: ${title}`}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-same-origin"
              srcDoc={docxSrcDoc}
            />
          ) : null}
          {!loading && !error && signedUrl && isOther ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Dit bestandstype kan niet in de browser worden getoond. Gebruik de knop om het te
                openen.
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
