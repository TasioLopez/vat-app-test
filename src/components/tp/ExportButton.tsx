'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExportLayoutKey = 'tp_2026' | 'vgr';

export function ExportButton({
  employeeId,
  tpInstanceId: tpInstanceIdProp,
  vgrInstanceId: vgrInstanceIdProp,
  layoutKey: layoutKeyProp,
  variant = 'default',
}: {
  employeeId: string;
  tpInstanceId?: string;
  vgrInstanceId?: string;
  layoutKey?: ExportLayoutKey;
  variant?: 'default' | 'icon';
}) {
  const params = useParams() as { tpInstanceId?: string; vgrInstanceId?: string };
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    setSavedMsg(null);

    try {
      const tpInstanceId = tpInstanceIdProp || params.tpInstanceId || null;
      const vgrInstanceId = vgrInstanceIdProp || params.vgrInstanceId || null;
      const layoutKey = layoutKeyProp || 'tp_2026';
      const filenamePrefix = layoutKey === 'vgr' ? 'VGR' : 'TP';
      const filename = `${filenamePrefix}-${employeeId}.pdf`;

      const query = new URLSearchParams({
        employeeId,
        filename,
        mode: 'json',
      });
      if (tpInstanceId) query.set('tpInstanceId', tpInstanceId);
      if (vgrInstanceId) query.set('vgrInstanceId', vgrInstanceId);
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

      try {
        const a = document.createElement('a');
        a.href = signedUrl;
        a.download = filename;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = signedUrl;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 60_000);
      }

      setSavedMsg('PDF generated and saved to Documents.');
    } catch (e) {
      console.error(e);
      alert('Something went wrong while exporting the PDF.');
    } finally {
      setBusy(false);
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
