'use client';

import React from 'react';
import {
  FUNCTIES_DELIMITER,
  FUNCTIES_SUBHEADING,
  TOELICHTING_DELIMITER,
  TOELICHTING_SUBHEADING,
} from '@/lib/tp/visie-loopbaanadviseur/constants';
import { BasisToelichtingHeading } from '@/components/tp2026/primitives';
import { renderTextWithLogoBullets } from '@/components/tp2026/BasisLegacyText';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

/**
 * Renders Visie loopbaanadviseur with internal Toelichting + Mogelijk passende functies subheadings.
 */
export function VisieLoopbaanadviseurBlock({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  if (!text?.trim()) return null;

  if (!text.includes(TOELICHTING_DELIMITER)) {
    return (
      <div className={className}>
        <Basis2026MarkdownBody markdown={text} />
      </div>
    );
  }

  const afterToelichting = text.split(TOELICHTING_DELIMITER)[1] ?? '';
  const [toelichtingBody, functiesBody = ''] = afterToelichting.split(FUNCTIES_DELIMITER);

  return (
    <div className={`text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      <BasisToelichtingHeading label={TOELICHTING_SUBHEADING} />
      <p className="mb-4">{toelichtingBody.trim()}</p>

      {functiesBody.trim() ? (
        <>
          <BasisToelichtingHeading label={FUNCTIES_SUBHEADING} />
          <div className="mt-1">
            {renderTextWithLogoBullets(functiesBody.trim(), true, true)}
          </div>
        </>
      ) : null}
    </div>
  );
}
