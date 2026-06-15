'use client';

import React from 'react';
import { ADVIES_DELIMITER } from '@/lib/tp/ad-advies/constants';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

const TEAL_BOLD_CLASS = 'text-[12px] font-bold leading-tight text-[#64b6a6]';

/**
 * Renders Advies passende arbeid: teal intro + italic AD quote only.
 */
export function AdviesPassendeArbeidBlock({
  text,
  className = '',
}: {
  text: string;
  className?: string;
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
  const intro = introBlock.trim();
  const quote = quoteBlock.trim();

  return (
    <div className={`text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      {intro ? <p className={TEAL_BOLD_CLASS}>{intro}</p> : null}
      {quote ? (
        <p className="mt-2">
          <em>&ldquo;{quote}&rdquo;</em>
        </p>
      ) : null}
    </div>
  );
}
