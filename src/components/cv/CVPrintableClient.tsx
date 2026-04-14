'use client';

import { useEffect } from 'react';
import { CVProvider } from '@/context/CVContext';
import type { CvModel, CvTemplateKey } from '@/types/cv';
import CVPreview from '@/components/cv/CVPreview';

type Props = {
  employeeId: string;
  cvId: string;
  title: string;
  templateKey: CvTemplateKey;
  accentColor: string;
  payload: CvModel;
};

export default function CVPrintableClient({
  employeeId,
  cvId,
  title,
  templateKey,
  accentColor,
  payload,
}: Props) {
  useEffect(() => {
    const root = document.getElementById('cv-print-root');
    if (!root) return;
    let cancelled = false;
    const to = window.setTimeout(() => {
      if (!cancelled) root.setAttribute('data-ready', '1');
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(to);
    };
  }, [employeeId, cvId, payload]);

  return (
    <CVProvider
      employeeId={employeeId}
      cvId={cvId}
      initialTitle={title}
      initialTemplateKey={templateKey}
      initialAccentColor={accentColor}
      initialPayload={payload}
    >
      <div id="cv-print-root" className="cv-print-root bg-gray-100 p-6 print:bg-white print:p-0">
        <CVPreview />
      </div>
    </CVProvider>
  );
}
