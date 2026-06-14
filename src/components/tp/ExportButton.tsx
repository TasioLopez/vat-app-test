'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExportButton({
  employeeId,
  tpInstanceId: tpInstanceIdProp,
  layoutKey: layoutKeyProp,
  variant = 'default',
}: {
  employeeId: string;
  tpInstanceId?: string;
  layoutKey?: 'tp_legacy' | 'tp_2026';
  variant?: 'default' | 'icon';
}) {
  const params = useParams() as { tpInstanceId?: string };
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    setSavedMsg(null);

    try {
      const tpInstanceId = tpInstanceIdProp || params.tpInstanceId || null;
      const layoutKey = layoutKeyProp || 'tp_legacy';
      const filenamePrefix = layoutKey === 'tp_2026' ? 'TP-2026' : 'TP';
      const filename = `${filenamePrefix}-${employeeId}.pdf`;

      // Ask the API for a signed URL that already includes Content-Disposition: attachment
      const query = new URLSearchParams({
        employeeId,
        filename,
        mode: 'json',
      });
      if (tpInstanceId) query.set('tpInstanceId', tpInstanceId);
      if (layoutKey) query.set('layoutKey', layoutKey);
      const res = await fetch(
        `/api/export-pdf?${query.toString()}`,
        { method: 'GET' }
      );
      const data = await res.json();

      if (!res.ok || !data?.signedUrl) {
        console.error('PDF build failed:', data);
        alert('PDF build failed. Check console/network.');
        return;
      }

      const signedUrl: string = data.signedUrl;

      // 1) Try a hidden anchor with download attr (best UX; keeps page in place)
      try {
        const a = document.createElement('a');
        a.href = signedUrl;
        a.download = filename; // hint for browsers that respect it
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // 2) Fallback: hidden iframe (works for cross-origin + Content-Disposition: attachment)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = signedUrl;
        document.body.appendChild(iframe);
        // clean up later
        setTimeout(() => iframe.remove(), 60_000);
      }

      setSavedMsg('PDF generated and saved to Documents.');
    } catch (e) {
      console.error(e);
      alert('Something went wrong while exporting the PDF.');
    } finally {
      setBusy(false);
      // optionally clear the toast after a bit
      setTimeout(() => setSavedMsg(null), 5000);
    }
  }

  const label = busy ? 'PDF genereren…' : 'Downloaden PDF';

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        size="icon"
        className="h-8 w-8 shrink-0 bg-black text-white hover:bg-gray-800"
        onClick={handleExport}
        disabled={busy}
        aria-label={label}
        title={savedMsg ?? label}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Download className="h-4 w-4" aria-hidden />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        className="rounded-2xl bg-black text-white hover:bg-gray-800"
        onClick={handleExport}
        disabled={busy}
      >
        {busy ? 'Genereren…' : 'Downloaden PDF'}
      </Button>
      {savedMsg && <span className="text-green-700 text-sm">{savedMsg}</span>}
    </div>
  );
}
