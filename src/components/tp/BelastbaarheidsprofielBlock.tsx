'use client';

import React from 'react';
import { PROGNOSE_DELIMITER } from '@/lib/tp/belastbaarheidsprofiel/constants';
import { BasisToelichtingHeading } from '@/components/tp2026/primitives';
import { renderTextWithLogoBullets } from '@/components/tp2026/BasisLegacyText';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

const TEAL_BOLD_CLASS = 'text-[12px] font-bold leading-tight text-[#64b6a6]';

function splitBeforeRubrieken(text: string): { intro: string; rest: string } {
  const bulletIdx = text.search(/\n•\s/);
  if (bulletIdx === -1) return { intro: text.trim(), rest: '' };
  return {
    intro: text.slice(0, bulletIdx).trim(),
    rest: text.slice(bulletIdx).trim(),
  };
}

function splitAfterRubrieken(rest: string): { bullets: string; spreekuurIntro: string } {
  const parts = rest.split(/\n\n+/);
  const bulletParts: string[] = [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.trim().startsWith('•')) {
      bulletParts.push(part);
    } else {
      textParts.push(part);
    }
  }

  return {
    bullets: bulletParts.join('\n\n'),
    spreekuurIntro: textParts.join('\n\n').trim(),
  };
}

/**
 * Renders Belastbaarheidsprofiel: FML intro + rubrieken + spreekuur intro + Prognose block.
 */
export function BelastbaarheidsprofielBlock({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  if (!text?.trim()) return null;

  if (!text.includes(PROGNOSE_DELIMITER)) {
    return (
      <div className={className}>
        <Basis2026MarkdownBody markdown={text} />
      </div>
    );
  }

  const [limitationsBlock, prognoseBlock] = text.split(PROGNOSE_DELIMITER);
  const { intro, rest } = splitBeforeRubrieken(limitationsBlock.trim());
  const { bullets, spreekuurIntro } = splitAfterRubrieken(rest);
  const quote = prognoseBlock.trim();

  return (
    <div className={`text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      {intro ? <p className={TEAL_BOLD_CLASS}>{intro}</p> : null}
      {bullets ? (
        <div className="my-3">{renderTextWithLogoBullets(bullets, false, true)}</div>
      ) : null}
      {spreekuurIntro ? <p className={`${TEAL_BOLD_CLASS} mt-3`}>{spreekuurIntro}</p> : null}
      {quote ? (
        <div className="mt-4">
          <BasisToelichtingHeading label="Prognose:" />
          <div className="mt-2 italic">
            <Basis2026MarkdownBody markdown={quote} withInlineQuotes />
          </div>
        </div>
      ) : null}
    </div>
  );
}
