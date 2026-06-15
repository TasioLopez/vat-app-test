'use client';

import React from 'react';
import { ADVIES_NB_NO_REPORT } from '@/lib/tp/ad-advies/constants';
import { buildAdAdviesBlock, parseAdAdvies } from '@/lib/tp/ad-advies/build-fields';
import { AdviesPassendeArbeidBlock } from '@/components/tp/AdviesPassendeArbeidBlock';

const TEXTAREA_CLASS =
  'w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function AdviesPassendeArbeidEditor({
  raw,
  hasAdReport,
  onChange,
}: {
  raw: string;
  hasAdReport?: boolean | null;
  onChange: (next: string) => void;
}) {
  const text = String(raw ?? '').trim();

  if (hasAdReport === false || text.startsWith('N.B.')) {
    return (
      <div className="rounded-md border border-[#b8985c]/40 bg-muted/30 px-3 py-2">
        <span className="text-sm font-bold text-neutral-900">
          {text || ADVIES_NB_NO_REPORT}
        </span>
      </div>
    );
  }

  const { intro, citaat } = parseAdAdvies(text);

  const updateIntro = (value: string) => {
    onChange(buildAdAdviesBlock(value, citaat));
  };

  const updateCitaat = (value: string) => {
    onChange(buildAdAdviesBlock(intro, value));
  };

  const previewRaw = buildAdAdviesBlock(intro, citaat);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">
          Intro (auteur en datum)
        </label>
        <textarea
          className={TEXTAREA_CLASS}
          value={intro}
          onChange={(e) => updateIntro(e.target.value)}
          rows={2}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">Advies (citaat)</label>
        <textarea
          className={TEXTAREA_CLASS}
          value={citaat}
          onChange={(e) => updateCitaat(e.target.value)}
          rows={6}
          placeholder="Letterlijk advies uit het AD-rapport…"
        />
      </div>
      {previewRaw.trim() ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <AdviesPassendeArbeidBlock text={previewRaw} className="text-sm leading-relaxed" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
