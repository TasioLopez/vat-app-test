'use client';

import React from 'react';
import { ADVIES_DELIMITER, isAdviesNbNoReport } from '@/lib/tp/ad-advies/constants';
import type { AdAdviesQuoteMarks } from '@/lib/tp/ad-advies/split-for-pagination';
import { patchAdviesIntroForConcept } from '@/lib/tp/ad-report-wording';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { TP_BASIS_TOELICHTING_CLASS } from '@/lib/tp2026/basis-document-layout';
import { useTPDocumentRender } from '@/context/TPDocumentRenderContext';
import { protectDutchDatesInText } from '@/lib/tp/date-line-breaks';

/**
 * Renders Advies passende arbeid: intro + italic AD quote only.
 */
export function AdviesPassendeArbeidBlock({
  text,
  className = '',
  adReportConcept = false,
  quoteMarks = 'both',
}: {
  text: string;
  className?: string;
  adReportConcept?: boolean;
  /** Absent or `both` draws opening and closing marks. Continuations pass `open`, `none`, or `close`. */
  quoteMarks?: AdAdviesQuoteMarks;
}) {
  const forDocument = useTPDocumentRender();
  const doc = (s: string) => (forDocument ? protectDutchDatesInText(s) : s);

  if (!text?.trim()) return null;

  if (isAdviesNbNoReport(text)) {
    return (
      <div className={className}>
        <span className="text-[12px] font-bold text-neutral-900">{doc(text.trim())}</span>
      </div>
    );
  }

  if (!text.includes(ADVIES_DELIMITER)) {
    return (
      <div className={className}>
        <Basis2026MarkdownBody markdown={text} />
      </div>
    );
  }

  const [introBlock, quoteBlock] = text.split(ADVIES_DELIMITER);
  const intro = patchAdviesIntroForConcept(introBlock.trim(), adReportConcept);
  const quote = quoteBlock.trim();

  return (
    <div className={`tp-body-prose text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      {intro ? <p className={TP_BASIS_TOELICHTING_CLASS}>{doc(intro)}</p> : null}
      {quote ? (
        <div className="mt-2 italic">
          <Basis2026MarkdownBody markdown={quote} withInlineQuotes quoteMarks={quoteMarks} />
        </div>
      ) : null}
    </div>
  );
}
