'use client';

import React from 'react';
import { ADVIES_NB_NO_REPORT } from '@/lib/tp/ad-advies/constants';
import { buildAdAdviesBlock, parseAdAdvies } from '@/lib/tp/ad-advies/build-fields';
import { AdviesPassendeArbeidBlock } from '@/components/tp/AdviesPassendeArbeidBlock';
import { ConfirmToEditBlock, TEXTAREA_CLASS } from '@/components/tp/ConfirmToEditBlock';
import { useDebouncedSync } from '@/hooks/useDebouncedSync';

export function AdviesPassendeArbeidEditor({
  raw,
  hasAdReport,
  onChange,
}: {
  raw: string;
  hasAdReport?: boolean | null;
  onChange: (next: string) => void;
}) {
  const { value: draft, setDraft } = useDebouncedSync({
    external: String(raw ?? ''),
    onSync: onChange,
  });

  if (hasAdReport === false || draft.trimStart().startsWith('N.B.')) {
    return (
      <div className="rounded-md border border-[#b8985c]/40 bg-muted/30 px-3 py-2">
        <span className="text-sm font-bold text-neutral-900">
          {draft.trim() || ADVIES_NB_NO_REPORT}
        </span>
      </div>
    );
  }

  const { intro, citaat } = parseAdAdvies(draft);

  const updateIntro = (value: string) => {
    setDraft(buildAdAdviesBlock(value, citaat));
  };

  const updateCitaat = (value: string) => {
    setDraft(buildAdAdviesBlock(intro, value));
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
      <ConfirmToEditBlock
        label="Advies (citaat)"
        value={citaat}
        onChange={updateCitaat}
        renderPreview={(quote) => (
          <AdviesPassendeArbeidBlock
            text={buildAdAdviesBlock('', quote)}
            className="text-sm leading-relaxed"
          />
        )}
        placeholder="Letterlijk advies uit het AD-rapport…"
        rows={6}
      />
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
