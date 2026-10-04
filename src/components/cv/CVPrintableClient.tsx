'use client';

import { useEffect } from 'react';
import { CVProvider, useCV } from '@/context/CVContext';
import type { CvDocumentPayload, CvLocale, CvTemplateKey } from '@/types/cv';
import CVPreview from '@/components/cv/CVPreview';

type Props = {
  employeeId: string;
  cvId: string;
  title: string;
  templateKey: CvTemplateKey;
  accentColor: string;
  payload: CvDocumentPayload;
  initialPhotoSignedUrl?: string | null;
  printLocale?: CvLocale;
};

function PrintReadyGate() {
  const { paginationReady, photoDisplayUrl, cvData } = useCV();

  useEffect(() => {
    const root = document.getElementById('cv-print-root');
    if (!root) return;

    let cancelled = false;
    let fallbackTimer: number | undefined;

    const markReady = () => {
      if (!cancelled) root.setAttribute('data-ready', '1');
    };

    const clearReady = () => {
      root.setAttribute('data-ready', '0');
    };

    clearReady();

    if (!paginationReady) {
      fallbackTimer = window.setTimeout(markReady, 8000);
      return () => {
        cancelled = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
      };
    }

    const needsPhoto =
      Boolean(photoDisplayUrl) && cvData.options?.includePhotoInCv === true;

    if (needsPhoto && photoDisplayUrl) {
      const img = new Image();
      img.onload = markReady;
      img.onerror = markReady;
      img.src = photoDisplayUrl;
      fallbackTimer = window.setTimeout(markReady, 4000);
      return () => {
        cancelled = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
      };
    }

    // Settle one frame after pagination so layout is painted.
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(markReady);
    });
    fallbackTimer = window.setTimeout(markReady, 1500);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, [paginationReady, photoDisplayUrl, cvData.options?.includePhotoInCv]);

  return <CVPreview />;
}

export default function CVPrintableClient({
  employeeId,
  cvId,
  title,
  templateKey,
  accentColor,
  payload,
  initialPhotoSignedUrl,
  printLocale,
}: Props) {
  return (
    <CVProvider
      employeeId={employeeId}
      cvId={cvId}
      initialTitle={title}
      initialTemplateKey={templateKey}
      initialAccentColor={accentColor}
      initialPayload={payload}
      initialPhotoSignedUrl={initialPhotoSignedUrl}
      readOnly
      printLocale={printLocale}
    >
      <div id="cv-print-root" className="cv-print-root bg-white print:bg-white print:p-0" data-ready="0">
        <PrintReadyGate />
      </div>
    </CVProvider>
  );
}
