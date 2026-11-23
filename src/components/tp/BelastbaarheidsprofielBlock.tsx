'use client';

import React from 'react';
import { PROGNOSE_DELIMITER } from '@/lib/tp/belastbaarheidsprofiel/constants';
import {
  splitAfterRubrieken,
  splitBeforeRubrieken,
} from '@/lib/tp/belastbaarheidsprofiel/list-markers';
import { renderTextWithLogoBullets } from '@/components/tp2026/BasisLegacyText';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { TP_BASIS_TOELICHTING_CLASS } from '@/lib/tp2026/basis-document-layout';
import { useTPDocumentRender } from '@/context/TPDocumentRenderContext';
import { protectDutchDatesInText } from '@/lib/tp/date-line-breaks';

function LimitationsWithLogoBullets({
  limitations,
  className = '',
  forDocument,
}: {
  limitations: string;
  className?: string;
  forDocument: boolean;
}) {
  const doc = (s: string) => (forDocument ? protectDutchDatesInText(s) : s);
  const { intro, rest } = splitBeforeRubrieken(limitations.trim());
  const { bullets, spreekuurIntro } = splitAfterRubrieken(rest);

  if (!bullets) {
    return (
      <div className={className}>
        <Basis2026MarkdownBody markdown={limitations} />
      </div>
    );
  }

  return (
    <div className={`tp-body-prose text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      {intro ? <p className={TP_BASIS_TOELICHTING_CLASS}>{doc(intro)}</p> : null}
      <div className="my-3">{renderTextWithLogoBullets(bullets, false, true, forDocument)}</div>
      {spreekuurIntro ? (
        <p className={`${TP_BASIS_TOELICHTING_CLASS} mt-3`}>{doc(spreekuurIntro)}</p>
      ) : null}
    </div>
  );
}

/**
 * Renders Belastbaarheidsprofiel: FML intro + rubrieken + spreekuur intro + prognose quote.
 */
export function BelastbaarheidsprofielBlock({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const forDocument = useTPDocumentRender();

  if (!text?.trim()) return null;

  if (!text.includes(PROGNOSE_DELIMITER)) {
    return (
      <LimitationsWithLogoBullets
        limitations={text}
        className={className}
        forDocument={forDocument}
      />
    );
  }

  const [limitationsBlock, prognoseBlock] = text.split(PROGNOSE_DELIMITER);
  const quote = prognoseBlock.trim();

  return (
    <div className={className}>
      <LimitationsWithLogoBullets
        limitations={limitationsBlock}
        forDocument={forDocument}
      />
      {quote ? (
        <div className="mt-2 italic">
          <Basis2026MarkdownBody markdown={quote} withInlineQuotes />
        </div>
      ) : null}
    </div>
  );
}
