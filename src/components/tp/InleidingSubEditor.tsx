'use client';

import React from 'react';
import {
  buildInleidingSubBlock,
  parseInleidingSub,
} from '@/lib/tp/inleiding/build-fields';
import { ConfirmToEditBlock, TEXTAREA_CLASS } from '@/components/tp/ConfirmToEditBlock';
import { InleidingSubQuotePreview } from '@/components/tp/InleidingSubBlock';

export function InleidingSubEditor({
  raw,
  onChange,
}: {
  raw: string;
  adReportConcept?: boolean;
  onChange: (next: string) => void;
}) {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  const { intro, quote } = parseInleidingSub(text);
  const isNbOnly = text.includes('N.B.:') && intro === text && !quote;

  if (isNbOnly) {
    return (
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">AD-toelichting (automatisch)</p>
        <div className="rounded-md border border-[#b8985c]/40 bg-muted/30 px-3 py-2">
          <span className="text-sm text-neutral-900">{text}</span>
        </div>
      </div>
    );
  }

  const updateIntro = (value: string) => {
    onChange(buildInleidingSubBlock(value, quote));
  };

  const updateQuote = (value: string) => {
    onChange(buildInleidingSubBlock(intro, value));
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">AD-toelichting (automatisch)</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">Intro (auteur en datum)</label>
        <textarea
          className={TEXTAREA_CLASS}
          value={intro}
          onChange={(e) => updateIntro(e.target.value)}
          rows={2}
        />
      </div>
      <ConfirmToEditBlock
        label="Advies (citaat)"
        value={quote}
        onChange={updateQuote}
        renderPreview={(q) => <InleidingSubQuotePreview quote={q} />}
        placeholder="Letterlijk advies uit het AD-rapport…"
        rows={6}
      />
    </div>
  );
}
