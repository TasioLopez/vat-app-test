'use client';

import React from 'react';
import { DataRow, TP2026FieldTable } from '@/components/tp2026/primitives';
import { INSCHALING_ROW_LABELS } from '@/lib/tp/pow-meter/constants';
import { parsePowInschaling } from '@/lib/tp/pow-meter/build-fields';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

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
        <DataRow label={INSCHALING_ROW_LABELS.huidige_trede} value={inschaling.huidige_trede || '—'} />
        <DataRow label={INSCHALING_ROW_LABELS.werkzame_uren} value={inschaling.werkzame_uren || '—'} />
        <DataRow label={INSCHALING_ROW_LABELS.verwachting} value={inschaling.verwachting || '—'} />
      </TP2026FieldTable>
    </div>
  );
}
