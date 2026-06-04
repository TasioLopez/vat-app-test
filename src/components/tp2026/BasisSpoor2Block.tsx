'use client';

import React from 'react';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { SalmonSectionBar, TealSubsectionTitle } from '@/components/tp2026/primitives';
import {
  TP_SPOOR2_SECTION_TITLE,
  TP_SPOOR2_SUBSECTIONS,
  TP_SPOOR2_TOELICHTING_BODY,
  TP_SPOOR2_TOELICHTING_TITLE,
} from '@/lib/tp2026/basis-spoor2-begeleiding';

const boxClass = 'border border-[#b8985c] bg-[#f5efe6] p-2.5 text-neutral-900';

/** Full static "Onderdelen Spoor 2 begeleiding" section (basis document). */
export function BasisSpoor2Block({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <SalmonSectionBar title={TP_SPOOR2_SECTION_TITLE} />
      <TealSubsectionTitle title={TP_SPOOR2_TOELICHTING_TITLE} />
      <div className={boxClass}>
        <Basis2026MarkdownBody markdown={TP_SPOOR2_TOELICHTING_BODY} />
      </div>
      {TP_SPOOR2_SUBSECTIONS.map((sub) => (
        <div key={sub.id} className="mt-2">
          <TealSubsectionTitle title={sub.title} />
          <div className={boxClass}>
            <Basis2026MarkdownBody markdown={sub.body} />
          </div>
        </div>
      ))}
    </div>
  );
}
