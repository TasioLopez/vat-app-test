'use client';

import React from 'react';
import {
  buildVisieLoopbaanadviseurBlock,
  parseVisieLoopbaanadviseur,
} from '@/lib/tp/visie-loopbaanadviseur/build-fields';
import { FUNCTIE_FOOTER } from '@/lib/tp/visie-loopbaanadviseur/constants';
import { VisieLoopbaanadviseurBlock } from '@/components/tp/VisieLoopbaanadviseurBlock';

const TEXTAREA_CLASS =
  'w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function VisieLoopbaanadviseurEditor({
  raw,
  onChange,
}: {
  raw: string;
  onChange: (next: string) => void;
}) {
  const parsed = parseVisieLoopbaanadviseur(String(raw ?? ''));

  const update = (patch: Partial<typeof parsed>) => {
    onChange(buildVisieLoopbaanadviseurBlock({ ...parsed, ...patch }));
  };

  const previewRaw = buildVisieLoopbaanadviseurBlock(parsed);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">Toelichting</label>
        <textarea
          className={TEXTAREA_CLASS}
          value={parsed.toelichting}
          onChange={(e) => update({ toelichting: e.target.value })}
          rows={5}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">
          Mogelijk passende functies — intro
        </label>
        <textarea
          className={TEXTAREA_CLASS}
          value={parsed.functiesIntro}
          onChange={(e) => update({ functiesIntro: e.target.value })}
          rows={3}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">
          Functies (4 regels)
        </label>
        <textarea
          className={TEXTAREA_CLASS}
          value={parsed.functieBullets}
          onChange={(e) => update({ functieBullets: e.target.value })}
          rows={6}
          placeholder="• Functienaam – toelichting"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Footer</label>
        <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-xs italic text-muted-foreground">
          {parsed.footer || FUNCTIE_FOOTER}
        </p>
      </div>
      {previewRaw.trim() ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <VisieLoopbaanadviseurBlock text={previewRaw} className="text-sm leading-relaxed" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
