'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026BasisFields } from '@/lib/tp2026/schema';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import FieldControl from '@/components/tp2026/FieldControl';

export { Basis2026A4Pages } from '@/components/tp2026/Basis2026A4Measured';

const Basis2026MarkdownFieldEditor = dynamic(
  () =>
    import('@/components/tp2026/Basis2026MarkdownFieldEditor').then((m) => m.Basis2026MarkdownFieldEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-md border border-dashed border-[#b8985c]/50 bg-muted/40" aria-hidden />
    ),
  }
);

export function Basis2026Editor({
  data,
  updateField,
  onAutofillField,
}: {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      {TP2026BasisFields.map((field: TP2026FieldDef) => (
        <BasisFieldEditorRow
          key={field.key}
          field={field}
          data={data}
          updateField={updateField}
          onAutofillField={onAutofillField}
        />
      ))}
    </div>
  );
}

function BasisFieldEditorRow({
  field,
  data,
  updateField,
  onAutofillField,
}: {
  field: TP2026FieldDef;
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
}) {
  const canAutofill = Boolean(onAutofillField && TP2026_BASIS_AUTOFILL_ENDPOINTS[field.key]);

  if (field.type !== 'multiline') {
    return <FieldControl field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />;
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">{field.label}</label>
        {canAutofill ? (
          <button
            type="button"
            className="text-xs font-medium text-[#6d2a96] underline underline-offset-2 hover:no-underline"
            onClick={() => void onAutofillField!(field.key)}
          >
            Autofill
          </button>
        ) : null}
      </div>
      <Basis2026MarkdownFieldEditor
        markdown={String(data[field.key] ?? '')}
        onChange={(md) => updateField(field.key, md)}
        placeholder={field.placeholder}
      />
    </div>
  );
}
