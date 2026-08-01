'use client';

import React from 'react';
import {
  FUNCTIES_SUBHEADING,
  TOELICHTING_DELIMITER,
} from '@/lib/tp/visie-loopbaanadviseur/constants';
import { parseVisieLoopbaanadviseur } from '@/lib/tp/visie-loopbaanadviseur/build-fields';
import { parseFunctieLine } from '@/lib/tp/visie-loopbaanadviseur/parse-functie-line';
import { BasisToelichtingHeading, ValentineZLogoBulletRow } from '@/components/tp2026/primitives';
import { formatInlineText } from '@/components/tp2026/BasisLegacyText';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import {
  formatBasisFootnoteDisplay,
  TP_BASIS_DISCLAIMER_CLASS,
} from '@/lib/tp2026/basis-document-layout';

function renderVisieLaFunctieBullets(bullets: string): React.ReactNode {
  const lines = bullets.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const parsed = parseFunctieLine(line);
        if (!parsed) return null;

        return (
          <ValentineZLogoBulletRow key={idx} className="ml-4" eagerLoading>
            <span className="font-bold">{parsed.title}</span>
            {parsed.description ? (
              <>
                {': '}
                <span className="font-normal">{formatInlineText(parsed.description)}</span>
              </>
            ) : null}
          </ValentineZLogoBulletRow>
        );
      })}
    </div>
  );
}

/**
 * Renders Visie loopbaanadviseur with internal Mogelijk passende functies subheading.
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

  const { toelichting, functiesIntro, functieBullets, footer } = parseVisieLoopbaanadviseur(text);

  return (
    <div className={`tp-body-prose text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      <p className="mb-4">{toelichting}</p>

      {functiesIntro || functieBullets || footer ? (
        <>
          <BasisToelichtingHeading label={FUNCTIES_SUBHEADING} />
          {functiesIntro ? <p className="mb-2">{functiesIntro}</p> : null}
          {functieBullets ? <div className="mt-1">{renderVisieLaFunctieBullets(functieBullets)}</div> : null}
          {footer ? (
            <p className={`mt-4 ${TP_BASIS_DISCLAIMER_CLASS}`}>
              {formatBasisFootnoteDisplay(footer)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
