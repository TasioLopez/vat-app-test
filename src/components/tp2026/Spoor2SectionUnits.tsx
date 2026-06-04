'use client';

import React from 'react';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { SalmonSectionBar } from '@/components/tp2026/primitives';
import { TP_SPOOR2_SECTION_TITLE } from '@/lib/tp2026/basis-spoor2-begeleiding';

export const TP_SPOOR2_COLOR_SALMON = '#df9180';
export const TP_SPOOR2_COLOR_HEADING = '#64b6a6';
export const TP_SPOOR2_COLOR_BODY_BG = '#f3efe4';

export const SPOOR2_BOX_CLASS = `bg-[#f3efe4] p-2.5 text-neutral-900`;

export const SPOOR2_HEADING_CLASS =
  'mb-1.5 text-[12px] font-bold leading-tight text-[#64b6a6]';

type MarginAtom = {
  kind: string;
  showMainBand?: boolean;
  showSubsectionTitle?: boolean;
};

/** Vertical spacing between basis body atoms (Spoor 2 + default). */
export function getAtomMarginClass(atom: MarginAtom, prev: MarginAtom | undefined): string {
  if (!prev) {
    if (atom.kind === 'spoor2' && atom.showMainBand) return 'mt-8';
    if (atom.kind === 'spoor2' && atom.showSubsectionTitle) return 'mt-4';
    return '';
  }
  if (atom.kind === 'spoor2') {
    if (atom.showMainBand) return 'mt-8';
    if (atom.showSubsectionTitle) return 'mt-4';
    return 'mt-3';
  }
  return 'mt-3';
}

export function Spoor2SubsectionUnit({
  showMainBand = false,
  showSubsectionTitle,
  subsectionTitle,
  body,
}: {
  showMainBand?: boolean;
  showSubsectionTitle: boolean;
  subsectionTitle: string;
  body: string;
}) {
  const trimmed = String(body || '').trim();

  return (
    <>
      {showMainBand ? (
        <SalmonSectionBar
          title={TP_SPOOR2_SECTION_TITLE}
          barColorClass="bg-[#df9180]"
          className="mb-3"
        />
      ) : null}
      {showSubsectionTitle ? (
        <div className={SPOOR2_HEADING_CLASS}>{subsectionTitle}</div>
      ) : null}
      {trimmed ? (
        <div className={SPOOR2_BOX_CLASS}>
          <Basis2026MarkdownBody markdown={trimmed} />
        </div>
      ) : null}
    </>
  );
}
