'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  buildBelastbaarheidsprofielBlock,
  parseBelastbaarheidsprofiel,
} from '@/lib/tp/belastbaarheidsprofiel/build-fields';
import { BelastbaarheidsprofielBlock } from '@/components/tp/BelastbaarheidsprofielBlock';
import { ConfirmToEditBlock } from '@/components/tp/ConfirmToEditBlock';

const Basis2026MarkdownFieldEditor = dynamic(
  () =>
    import('@/components/tp2026/Basis2026MarkdownFieldEditor').then((m) => m.Basis2026MarkdownFieldEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-md border border-dashed border-[#b8985c]/50 bg-muted/40" aria-hidden />
    ),
  }
);

function PrognoseQuotePreview({ quote }: { quote: string }) {
  const synthetic = buildBelastbaarheidsprofielBlock('', quote);
  return <BelastbaarheidsprofielBlock text={synthetic} className="text-sm leading-relaxed" />;
}

export function BelastbaarheidsprofielEditor({
  raw,
  onChange,
}: {
  raw: string;
  onChange: (next: string) => void;
}) {
  const { limitationsBlock, prognoseQuote } = parseBelastbaarheidsprofiel(String(raw ?? ''));

  const updateLimitations = (value: string) => {
    onChange(buildBelastbaarheidsprofielBlock(value, prognoseQuote));
  };

  const updatePrognoseQuote = (value: string) => {
    onChange(buildBelastbaarheidsprofielBlock(limitationsBlock, value));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">
          Beperkingen en toelichting
        </label>
        <Basis2026MarkdownFieldEditor
          markdown={limitationsBlock}
          onChange={updateLimitations}
          placeholder="FML-intro, rubrieken en spreekuur-toelichting…"
        />
      </div>
      <ConfirmToEditBlock
        label="Prognose (citaat)"
        value={prognoseQuote}
        onChange={updatePrognoseQuote}
        renderPreview={(quote) => <PrognoseQuotePreview quote={quote} />}
        placeholder="Letterlijk prognose- en re-integratiecitaat uit het bronrapport…"
        rows={8}
      />
    </div>
  );
}
