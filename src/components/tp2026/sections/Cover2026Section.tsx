'use client';

import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026CoverFields } from '@/lib/tp2026/schema';
import { A4Page } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';

export function Cover2026Editor({
  data,
  updateField,
}: {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      {TP2026CoverFields.map((field: TP2026FieldDef) => (
        <FieldControl key={field.key} field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />
      ))}
    </div>
  );
}

export function Cover2026A4({ data }: { data: Record<string, any> }) {
  void data;

  return (
    <A4Page className="relative" style={{ backgroundColor: '#c8bd90' }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/tp2026-cover-original.svg)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'auto 86%',
          backgroundPosition: 'center top',
        }}
      />
    </A4Page>
  );
}
