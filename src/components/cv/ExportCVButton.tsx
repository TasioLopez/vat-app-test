'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExportCVButton({
  employeeId,
  cvId,
}: {
  employeeId: string;
  cvId: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    try {
      const filename = `CV-${cvId.slice(0, 8)}.pdf`;
      const res = await fetch(
        `/api/export-cv-pdf?employeeId=${encodeURIComponent(employeeId)}&cvId=${encodeURIComponent(
          cvId
        )}&filename=${encodeURIComponent(filename)}&mode=json`,
        { method: 'GET' }
      );
      const data = await res.json();
      if (!res.ok || !data?.signedUrl) {
        console.error('CV PDF export failed:', data);
        alert('PDF-export mislukt. Controleer de console.');
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

  return (
    <Button
      type="button"
      className="gap-2 bg-[#00A3CC] hover:bg-[#0088aa] text-white"
      onClick={handleExport}
      disabled={busy}
    >
      <Download className="h-4 w-4" />
      {busy ? 'Bezig…' : 'Download PDF'}
    </Button>
  );
}
