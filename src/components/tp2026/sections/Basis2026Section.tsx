'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026BasisFields } from '@/lib/tp2026/schema';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import FieldControl from '@/components/tp2026/FieldControl';
import { Spoor2ActivitiesEditor } from '@/components/tp2026/Spoor2ActivitiesEditor';
import { InleidingSubBlock } from '@/components/tp/InleidingSubBlock';
import { TP_SPOOR2_SECTION_TITLE } from '@/lib/tp2026/basis-spoor2-begeleiding';

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
      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">{TP_SPOOR2_SECTION_TITLE}</label>
        <p className="mb-3 text-xs text-muted-foreground">
          Selecteer welke onderdelen in het trajectplan verschijnen. Optioneel kunt u per onderdeel een subtekst met
          Z-logo toevoegen.
        </p>
        <Spoor2ActivitiesEditor
          tp3Activities={data.tp3_activities}
          onChange={(next) => updateField('tp3_activities', next)}
        />
      </div>
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
  if (field.key === 'inleiding_sub') {
    return null;
  }

  const canAutofill = Boolean(onAutofillField && TP2026_BASIS_AUTOFILL_ENDPOINTS[field.key]);

  if (field.type !== 'multiline') {
    return <FieldControl field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />;
  }

  const inleidingSub = field.key === 'inleiding' ? String(data.inleiding_sub ?? '').trim() : '';

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
      {inleidingSub ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">AD-toelichting (automatisch)</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-muted/30 px-3 py-2">
            <InleidingSubBlock text={inleidingSub} className="text-sm leading-relaxed text-neutral-900" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
