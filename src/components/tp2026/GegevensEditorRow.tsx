'use client';

import FieldControl, { type FieldControlLayout } from '@/components/tp2026/FieldControl';
import {
  getGegevensFieldDef,
  type GegevensEditorRow,
  type GegevensFieldLayout,
  type GegevensFieldSpan,
} from '@/lib/tp2026/gegevens-editor-layout';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';

function shouldHideField(key: string, data: Record<string, unknown>): boolean {
  if (key === 'ad_report_date' && data.has_ad_report === false) return true;
  if (key === 'computer_skills' && data.has_computer === false) return true;
  return false;
}

function resolveLayout(
  field: TP2026FieldDef,
  rowLayout: GegevensFieldLayout | GegevensFieldLayout[] | undefined,
  index: number
): FieldControlLayout {
  if (field.type === 'multiline') return 'stack';
  if (Array.isArray(rowLayout)) return rowLayout[index] ?? 'stack';
  if (rowLayout) return rowLayout;
  if (field.type === 'date') return 'row';
  if (field.key === 'has_ad_report') return 'stack';
  return 'stack';
}

function resolveFieldProps(field: TP2026FieldDef, layout: FieldControlLayout) {
  return {
    layout,
    compactBoolean: field.type === 'boolean',
    minRows: field.type === 'multiline' ? 2 : undefined,
  };
}

function gridClassForRow(keys: string[], spans?: GegevensFieldSpan[]): string {
  if (keys.length === 3) return 'grid grid-cols-3 gap-x-3 gap-y-3';
  if (keys.length === 2) {
    const allHalf = !spans || spans.every((s) => s === 'half' || !s);
    if (allHalf) return 'grid grid-cols-2 gap-x-4 gap-y-3';
  }
  return 'grid grid-cols-1 gap-y-3';
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

  const gridClass = gridClassForRow(visibleKeys, row.spans);

  return (
    <div className={gridClass}>
      {visibleKeys.map((key) => {
        const field = getGegevensFieldDef(key);
        const originalIndex = row.keys.indexOf(key);
        const layout = resolveLayout(field, row.layout, originalIndex);
        const props = resolveFieldProps(field, layout);

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
  );
}
