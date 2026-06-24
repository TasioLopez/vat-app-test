'use client';

import React from 'react';
import { TP2026FieldTable } from '@/components/tp2026/primitives';
import {
  TP2026_CELL_BG_WARM,
  TP2026_DATA_ROW_CLASS,
  TP2026_DATA_ROW_LABEL_CLASS,
  TP2026_DATA_ROW_VALUE_CLASS,
} from '@/lib/tp2026/tp2026-colors';
import { INSCHALING_ROW_LABELS } from '@/lib/tp/pow-meter/constants';
import { parsePowInschaling } from '@/lib/tp/pow-meter/build-fields';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

function PowInschalingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${TP2026_DATA_ROW_CLASS} grid grid-cols-[minmax(0,32%)_minmax(0,68%)] text-[11px] leading-snug`}>
      <div className={`${TP2026_DATA_ROW_LABEL_CLASS} whitespace-normal py-1`} style={{ backgroundColor: TP2026_CELL_BG_WARM }}>
        {label}
      </div>
      <div className={`${TP2026_DATA_ROW_VALUE_CLASS} whitespace-pre-wrap py-1`}>
        {value || '—'}
      </div>
    </div>
  );
}

/**
 * Renders Inschaling POW-meter™ table (3 rows) from delimiter JSON storage.
 */
export function PowInschalingTable({
  raw,
  className = '',
}: {
  raw: string;
  className?: string;
}) {
  const inschaling = parsePowInschaling(raw);

  if (!inschaling) {
    const legacy = String(raw || '').trim();
    if (!legacy) return null;
    return (
      <div className={className}>
        <Basis2026MarkdownBody markdown={legacy} />
      </div>
    );
  }

  return (
    <div className={className}>
      <TP2026FieldTable>
        <PowInschalingRow
          label={INSCHALING_ROW_LABELS.huidige_trede}
          value={inschaling.huidige_trede}
        />
        <PowInschalingRow
          label={INSCHALING_ROW_LABELS.werkzame_uren}
          value={inschaling.werkzame_uren}
        />
        <PowInschalingRow
          label={INSCHALING_ROW_LABELS.verwachting}
          value={inschaling.verwachting}
        />
      </TP2026FieldTable>
    </div>
  );
}
