'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CvLocale } from '@/types/cv';
import { cn } from '@/lib/utils';

export function ExportCVShareButton({
  shareToken,
  variant = 'default',
  locale = 'nl',
  label,
}: {
  shareToken: string;
  variant?: 'default' | 'icon';
  locale?: CvLocale;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const iconOnly = variant === 'icon';

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    try {
      const filename = `CV-${locale.toUpperCase()}.pdf`;
      const res = await fetch(
        `/api/cv-share/${encodeURIComponent(shareToken)}/export-pdf?locale=${locale}&filename=${encodeURIComponent(filename)}&mode=json`,
        { method: 'GET' }
      );
      const data = await res.json();
      if (!res.ok || !data?.signedUrl) {
        console.error('CV share PDF export failed:', data);
        alert('PDF-export mislukt.');
        return;
      }
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert('Er ging iets mis bij het exporteren.');
    } finally {
      setBusy(false);
    }
  }

  const ariaLabel = label ?? (busy ? 'PDF exporteren…' : `Download PDF (${locale.toUpperCase()})`);

  if (iconOnly) {
    return (
      <Button
        type="button"
        size="icon"
        className={cn(
          'h-8 w-8 shrink-0 bg-[#00A3CC] hover:bg-[#0088aa] text-white',
          'focus-visible:ring-2 focus-visible:ring-[#00A3CC]/50',
          locale === 'en' && 'bg-slate-600 hover:bg-slate-700'
        )}
        onClick={handleExport}
        disabled={busy}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      className="gap-2 bg-[#00A3CC] hover:bg-[#0088aa] text-white"
      onClick={handleExport}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      {busy ? 'Bezig…' : label ?? `Download PDF (${locale.toUpperCase()})`}
    </Button>
  );
}
