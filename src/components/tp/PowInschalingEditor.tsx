'use client';

import React from 'react';
import { INSCHALING_ROW_LABELS } from '@/lib/tp/pow-meter/constants';
import {
  buildPowMeterStorage,
  parsePowInschaling,
  parsePowToelichting,
  type PowInschalingData,
} from '@/lib/tp/pow-meter/build-fields';
import { TP2026_VISIE_PLAATSBARHEID_TITLE } from '@/lib/tp2026/basis-profiel-field-order';
import { PowInschalingTable } from '@/components/tp/PowInschalingTable';
import { PerspectiefOpWerkBlock } from '@/components/tp/PerspectiefOpWerkBlock';
import { useDebouncedSync } from '@/hooks/useDebouncedSync';
import {
  applyExToPowInschalingLeaves,
  applyExWerknemerWording,
  stripExFromPowInschalingLeaves,
  stripExWerknemerDisplayWording,
} from '@/lib/tp/ex-werknemer-wording';

const TEXTAREA_CLASS =
  'w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function emptyInschaling(): PowInschalingData {
  return { huidige_trede: '', werkzame_uren: '', verwachting: '' };
}

/**
 * POW editor: store stays plain werknemer; display applies Ex- at leaf (cells + toelichting).
 */
export function PowInschalingEditor({
  raw,
  onChange,
  isEx,
}: {
  raw: string;
  onChange: (next: string) => void;
  isEx: boolean;
}) {
  const { value: draft, setDraft } = useDebouncedSync({
    external: raw,
    onSync: onChange,
  });
  const parsed = parsePowInschaling(draft) ?? emptyInschaling();
  const toelichting = parsePowToelichting(draft);
  const displayCells = applyExToPowInschalingLeaves(parsed, isEx);
  const displayToelichting = isEx ? applyExWerknemerWording(toelichting, true) : toelichting;

  const updateField = (key: keyof PowInschalingData, value: string) => {
    const nextDisplay: PowInschalingData = { ...displayCells, [key]: value };
    const nextStored = isEx ? stripExFromPowInschalingLeaves(nextDisplay) : nextDisplay;
    const nextToelichting = isEx ? stripExWerknemerDisplayWording(displayToelichting) : toelichting;
    setDraft(buildPowMeterStorage(nextStored, nextToelichting));
  };

  const updateToelichting = (value: string) => {
    const storedToelichting = isEx ? stripExWerknemerDisplayWording(value) : value;
    const storedCells = isEx ? stripExFromPowInschalingLeaves(displayCells) : parsed;
    setDraft(buildPowMeterStorage(storedCells, storedToelichting));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Perspectief op werk (vast)</p>
        <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
          <PerspectiefOpWerkBlock className="text-sm leading-relaxed" isEx={isEx} />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#702A90]">
            {INSCHALING_ROW_LABELS.huidige_trede}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={displayCells.huidige_trede}
            onChange={(e) => updateField('huidige_trede', e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#702A90]">
            {INSCHALING_ROW_LABELS.werkzame_uren}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={displayCells.werkzame_uren}
            onChange={(e) => updateField('werkzame_uren', e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#702A90]">
            {INSCHALING_ROW_LABELS.verwachting}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={displayCells.verwachting}
            onChange={(e) => updateField('verwachting', e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#702A90]">{TP2026_VISIE_PLAATSBARHEID_TITLE}</label>
        <textarea
          className={TEXTAREA_CLASS}
          value={displayToelichting}
          onChange={(e) => updateToelichting(e.target.value)}
          rows={5}
        />
      </div>

      {(parsed.huidige_trede || parsed.werkzame_uren || parsed.verwachting) && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <PowInschalingTable raw={draft} isEx={isEx} />
          </div>
        </div>
      )}
    </div>
  );
}
