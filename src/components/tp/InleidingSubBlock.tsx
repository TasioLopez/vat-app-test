'use client';

import React from 'react';
import { patchInleidingAdIntroForConcept } from '@/lib/tp/ad-report-wording';
import {
  parseInleidingSub,
  stripInleidingSubQuoteWrapping,
} from '@/lib/tp/inleiding/build-fields';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

const NB_PATTERN = 'nog geen AD-rapport';

/**
 * Renders inleiding_sub using delimiter-based parsing.
 * Intro (up to and including the AD delimiter phrase) = bold.
 * Quote (rest) = italic with quotation marks.
 */
export function InleidingSubBlock({
  text,
  className = '',
  adReportConcept = false,
}: {
  text: string;
  className?: string;
  adReportConcept?: boolean;
}) {
  if (!text) return null;

  if (text.includes('N.B.:') && text.includes(NB_PATTERN)) {
    return <p className={className}>{text}</p>;
  }

  const { intro, quote } = parseInleidingSub(text);
  const patchedIntro = patchInleidingAdIntroForConcept(intro, adReportConcept);

  if (quote) {
    return (
      <div className={className}>
        <strong>{patchedIntro}</strong>
        <div className="mt-4 italic">
          <span aria-hidden>&ldquo;</span>
          <Basis2026MarkdownBody markdown={quote} />
          <span aria-hidden>&rdquo;</span>
        </div>
      </div>
    );
  }

  if (patchedIntro !== text.trim()) {
    return (
      <div className={className}>
        <strong>{patchedIntro}</strong>
      </div>
    );
  }

  return <p className={className}>{text}</p>;
}

/** Renders only the quoted portion of inleiding_sub (for ConfirmToEditBlock preview). */
export function InleidingSubQuotePreview({
  quote,
  className = '',
}: {
  quote: string;
  className?: string;
}) {
  const cleaned = stripInleidingSubQuoteWrapping(quote);
  if (!cleaned) return null;
  return (
    <div className={`${className} italic`}>
      <span aria-hidden>&ldquo;</span>
      <Basis2026MarkdownBody markdown={cleaned} />
      <span aria-hidden>&rdquo;</span>
    </div>
  );
}
