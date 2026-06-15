'use client';

import React from 'react';
import { INSCHALING_ROW_LABELS } from '@/lib/tp/pow-meter/constants';
import {
  buildPowInschalingBlock,
  parsePowInschaling,
  type PowInschalingData,
} from '@/lib/tp/pow-meter/build-fields';
import { PowInschalingTable } from '@/components/tp/PowInschalingTable';
import { PerspectiefOpWerkBlock } from '@/components/tp/PerspectiefOpWerkBlock';

const TEXTAREA_CLASS =
  'w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function emptyInschaling(): PowInschalingData {
  return { huidige_trede: '', werkzame_uren: '', verwachting: '' };
}

export function PowInschalingEditor({
  raw,
  onChange,
}: {
  raw: string;
  onChange: (next: string) => void;
}) {
  const parsed = parsePowInschaling(raw) ?? emptyInschaling();

  const updateField = (key: keyof PowInschalingData, value: string) => {
    const next: PowInschalingData = { ...parsed, [key]: value };
    onChange(buildPowInschalingBlock(next));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Perspectief op werk (vast)</p>
        <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
          <PerspectiefOpWerkBlock className="text-sm leading-relaxed" />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6d2a96]">
            {INSCHALING_ROW_LABELS.huidige_trede}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={parsed.huidige_trede}
            onChange={(e) => updateField('huidige_trede', e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6d2a96]">
            {INSCHALING_ROW_LABELS.werkzame_uren}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={parsed.werkzame_uren}
            onChange={(e) => updateField('werkzame_uren', e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6d2a96]">
            {INSCHALING_ROW_LABELS.verwachting}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={parsed.verwachting}
            onChange={(e) => updateField('verwachting', e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {(parsed.huidige_trede || parsed.werkzame_uren || parsed.verwachting) && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <PowInschalingTable raw={buildPowInschalingBlock(parsed)} />
          </div>
        </div>
      )}
    </div>
  );
}
