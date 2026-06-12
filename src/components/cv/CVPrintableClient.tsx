'use client';

import { useEffect } from 'react';
import { CVProvider } from '@/context/CVContext';
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
  useEffect(() => {
    const root = document.getElementById('cv-print-root');
    if (!root) return;
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) root.setAttribute('data-ready', '1');
    };

    const activeModel =
      printLocale === 'en' && payload.content.en ? payload.content.en : payload.content.nl;
    if (initialPhotoSignedUrl && activeModel.options?.includePhotoInCv) {
      const img = new Image();
      img.onload = markReady;
      img.onerror = markReady;
      img.src = initialPhotoSignedUrl;
      const fallback = window.setTimeout(markReady, 4000);
      return () => {
        cancelled = true;
        window.clearTimeout(fallback);
      };
    }

    const to = window.setTimeout(markReady, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(to);
    };
  }, [employeeId, cvId, payload, initialPhotoSignedUrl, printLocale]);

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
      <div id="cv-print-root" className="cv-print-root bg-gray-100 p-6 print:bg-white print:p-0">
        <CVPreview />
      </div>
    </CVProvider>
  );
}
