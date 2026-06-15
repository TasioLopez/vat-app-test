'use client';

import React from 'react';
import {
  FUNCTIE_FOOTER,
  FUNCTIES_DELIMITER,
  FUNCTIES_SUBHEADING,
  TOELICHTING_DELIMITER,
  TOELICHTING_SUBHEADING,
} from '@/lib/tp/visie-loopbaanadviseur/constants';
import { BasisToelichtingHeading } from '@/components/tp2026/primitives';
import { formatInlineText } from '@/components/tp2026/BasisLegacyText';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

function splitFunctiesBody(body: string): { intro: string; bullets: string; footer: string } {
  const trimmed = body.trim();
  if (!trimmed) return { intro: '', bullets: '', footer: '' };

  const footerMarker = FUNCTIE_FOOTER.replace(/^\*/, '').slice(0, 40);
  const footerIdx = trimmed.indexOf(footerMarker);
  if (footerIdx === -1) {
    const lines = trimmed.split('\n');
    const bulletStart = lines.findIndex((l) => /^[•☑✓\-]/.test(l.trim()));
    if (bulletStart <= 0) return { intro: trimmed, bullets: '', footer: '' };
    return {
      intro: lines.slice(0, bulletStart).join('\n').trim(),
      bullets: lines.slice(bulletStart).join('\n').trim(),
      footer: '',
    };
  }

  const beforeFooter = trimmed.slice(0, footerIdx).trim();
  const footer = trimmed.slice(footerIdx).trim();
  const lines = beforeFooter.split('\n');
  const bulletStart = lines.findIndex((l) => /^[•☑✓\-]/.test(l.trim()));
  if (bulletStart <= 0) {
    return { intro: beforeFooter, bullets: '', footer };
  }
  return {
    intro: lines.slice(0, bulletStart).join('\n').trim(),
    bullets: lines.slice(bulletStart).join('\n').trim(),
    footer,
  };
}

function parseFunctieLine(line: string): { title: string; description: string } | null {
  const content = line.trim().replace(/^[•☑✓\-]\s*/, '');
  if (!content) return null;

  const boldDash = content.match(/^\*\*(.+?)\*\*\s*[–—-]\s*(.+)$/);
  if (boldDash) {
    return { title: boldDash[1].trim(), description: boldDash[2].trim() };
  }

  const plainDash = content.match(/^(.+?)\s*[–—-]\s*(.+)$/);
  if (plainDash) {
    return { title: plainDash[1].trim(), description: plainDash[2].trim() };
  }

  const boldOnly = content.match(/^\*\*(.+?)\*\*$/);
  if (boldOnly) {
    return { title: boldOnly[1].trim(), description: '' };
  }

  return { title: content, description: '' };
}

function renderVisieLaFunctieBullets(bullets: string): React.ReactNode {
  const lines = bullets.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const parsed = parseFunctieLine(line);
        if (!parsed) return null;

        return (
          <div key={idx} className="ml-4 flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/val-logo.jpg"
              alt=""
              width={14}
              height={14}
              style={{ marginTop: '3px', flexShrink: 0 }}
              loading="eager"
            />
            <span>
              <span className="font-bold">{parsed.title}</span>
              {parsed.description ? (
                <>
                  {' – '}
                  <span className="font-normal">{formatInlineText(parsed.description)}</span>
                </>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
  const { intro, bullets, footer } = splitFunctiesBody(functiesBody);

  return (
    <div className={`text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      <BasisToelichtingHeading label={TOELICHTING_SUBHEADING} />
      <p className="mb-4">{toelichtingBody.trim()}</p>

      {functiesBody.trim() ? (
        <>
          <BasisToelichtingHeading label={FUNCTIES_SUBHEADING} />
          {intro ? <p className="mb-2">{intro}</p> : null}
          {bullets ? <div className="mt-1">{renderVisieLaFunctieBullets(bullets)}</div> : null}
          {footer ? (
            <p className="mt-4 text-[#6d2a96] italic">{formatInlineText(footer)}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
