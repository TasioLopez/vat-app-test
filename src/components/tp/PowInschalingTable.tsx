'use client';

import React from 'react';
import { DataRow, TP2026FieldTable } from '@/components/tp2026/primitives';
import { INSCHALING_ROW_LABELS } from '@/lib/tp/pow-meter/constants';
import { parsePowInschaling } from '@/lib/tp/pow-meter/build-fields';
import { applyExWerknemerWording } from '@/lib/tp/ex-werknemer-wording';
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';

const POW_INSCHALING_COL_WIDTHS: [string, string] = ['32%', '68%'];

const POW_ROW_CLASS = 'text-[11px]';
const POW_LABEL_CLASS = 'whitespace-normal py-1';
const POW_VALUE_CLASS = 'whitespace-pre-wrap py-1';

/**
 * Renders Inschaling POW-meter™ table (3 rows) from delimiter JSON storage.
 * Apply ex-wording to parsed cell values (not the JSON blob — quoted spans would skip it).
 */
export function PowInschalingTable({
  raw,
  className = '',
  isEx = false,
}: {
  raw: string;
  className?: string;
  isEx?: boolean;
}) {
  const inschaling = parsePowInschaling(raw);

  if (!inschaling) {
    const legacy = String(raw || '').trim();
    if (!legacy) return null;
    return (
      <div className={className}>
        <Basis2026MarkdownBody markdown={applyExWerknemerWording(legacy, isEx)} />
      </div>
    );
  }

  const wording = (text: string) => applyExWerknemerWording(text, isEx);

  return (
    <div className={className}>
      <TP2026FieldTable colWidths={POW_INSCHALING_COL_WIDTHS}>
        <DataRow
          label={INSCHALING_ROW_LABELS.huidige_trede}
          value={wording(inschaling.huidige_trede)}
          className={POW_ROW_CLASS}
          labelClassName={POW_LABEL_CLASS}
          valueClassName={POW_VALUE_CLASS}
        />
        <DataRow
          label={INSCHALING_ROW_LABELS.werkzame_uren}
          value={wording(inschaling.werkzame_uren)}
          className={POW_ROW_CLASS}
          labelClassName={POW_LABEL_CLASS}
          valueClassName={POW_VALUE_CLASS}
        />
        <DataRow
          label={INSCHALING_ROW_LABELS.verwachting}
          value={wording(inschaling.verwachting)}
          className={POW_ROW_CLASS}
          labelClassName={POW_LABEL_CLASS}
          valueClassName={POW_VALUE_CLASS}
        />
      </TP2026FieldTable>
    </div>
  );
}
