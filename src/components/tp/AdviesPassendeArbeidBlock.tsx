'use client';

import React from 'react';
import { ADVIES_DELIMITER } from '@/lib/tp/ad-advies/constants';
import { patchAdviesIntroForConcept } from '@/lib/tp/ad-report-wording';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { TP_BASIS_TOELICHTING_CLASS } from '@/lib/tp2026/basis-document-layout';

/**
 * Renders Advies passende arbeid: intro + italic AD quote only.
 */
export function AdviesPassendeArbeidBlock({
  text,
  className = '',
  adReportConcept = false,
}: {
  text: string;
  className?: string;
  adReportConcept?: boolean;
}) {
  if (!text?.trim()) return null;

  if (text.trim().startsWith('N.B.')) {
    return (
      <div className={className}>
        <span className="text-[12px] font-bold text-neutral-900">{text.trim()}</span>
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
    <div className={`text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      {intro ? <p className={TP_BASIS_TOELICHTING_CLASS}>{intro}</p> : null}
      {quote ? (
        <div className="mt-2 italic">
          <Basis2026MarkdownBody markdown={quote} withInlineQuotes />
        </div>
      ) : null}
    </div>
  );
}
