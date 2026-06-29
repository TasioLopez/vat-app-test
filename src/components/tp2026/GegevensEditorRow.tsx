'use client';

import { GegevensSubsectionTitle } from '@/components/tp2026/GegevensEditorSection';
import FieldControl from '@/components/tp2026/FieldControl';
import {
  getGegevensFieldDef,
  type GegevensEditorRow,
  type GegevensFieldSpan,
} from '@/lib/tp2026/gegevens-editor-layout';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { hasFilledAdReportDate } from '@/lib/tp/intake-ad-presence';

function shouldHideField(key: string, data: Record<string, unknown>): boolean {
  if (
    key === 'ad_report_date' &&
    data.has_ad_report === false &&
    !hasFilledAdReportDate(data.ad_report_date)
  ) {
    return true;
  }
  if (key === 'drivers_license_type' && data.drivers_license !== true) return true;
  if (key === 'computer_skills' && data.has_computer === false) return true;
  return false;
}

function resolveFieldProps(field: TP2026FieldDef) {
  return {
    layout: 'stack' as const,
    compactBoolean: field.type === 'boolean',
    minRows: field.type === 'multiline' ? 3 : undefined,
  };
}

function gridClassForRow(keys: string[], spans?: GegevensFieldSpan[], override?: string): string {
  if (override) return override;
  if (keys.length === 3) return 'grid grid-cols-1 gap-y-4 sm:grid-cols-2 lg:grid-cols-3';
  if (keys.length === 2) return 'grid grid-cols-1 gap-y-4 sm:grid-cols-2';
  return 'grid grid-cols-1 gap-y-4';
}

export function GegevensEditorRow({
  row,
  data,
  updateField,
}: {
  row: GegevensEditorRow;
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
}) {
  const visibleKeys = row.keys.filter((key) => !shouldHideField(key, data));
  if (visibleKeys.length === 0) return null;

  const gridClass = gridClassForRow(visibleKeys, row.spans, row.gridClass);

  return (
    <div className="space-y-3">
      {row.subsection ? <GegevensSubsectionTitle>{row.subsection}</GegevensSubsectionTitle> : null}
      <div className={gridClass}>
        {visibleKeys.map((key) => {
          const field = getGegevensFieldDef(key);
          const props = resolveFieldProps(field);

          return (
            <FieldControl
              key={key}
              field={field}
              value={data[key]}
              onChange={(v) => updateField(key, v)}
              {...props}
            />
          );
        })}
      </div>
    </div>
  );
}
