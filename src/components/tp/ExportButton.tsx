'use client';
import { useState } from 'react';

export function ExportButton({ employeeId }: { employeeId: string }) {
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    setSavedMsg(null);

    try {
      const filename = `TP-${employeeId}.pdf`;

      // Ask the API for a signed URL that already includes Content-Disposition: attachment
      const res = await fetch(
        `/api/export-pdf?employeeId=${encodeURIComponent(employeeId)}&filename=${encodeURIComponent(
          filename
        )}&mode=json`,
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

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        disabled={busy}
        className="rounded-2xl px-4 py-2 shadow bg-black text-white font-medium disabled:opacity-60 hover:cursor-pointer hover:bg-gray-800 transition-all-duration-200"
        type="button"
      >
        {busy ? 'Genereren…' : 'Downloaden PDF'}
      </button>
      {savedMsg && <span className="text-green-700 text-sm">{savedMsg}</span>}
    </div>
  );
}
