'use client';

import Image from 'next/image';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026CoverFields } from '@/lib/tp2026/schema';
import { A4Page } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';
import Logo2 from '@/assets/images/logo-2.png';

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
  const employeeName =
    data.employee_name ||
    [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
    '—';

  return (
    <A4Page className="relative" style={{ backgroundColor: '#c8bd90' }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/tp2026-cover-original.svg)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'auto 84%',
          backgroundPosition: 'center top',
        }}
      />
      <div className="absolute left-[68px] top-[52px]">
        <Image src={Logo2} alt="ValentineZ" width={162} height={41} />
      </div>

      <div className="absolute left-0 right-0 top-[512px] h-[98px] px-[188px] py-[12px] box-border">
        <h1 className="text-[30px] leading-[1.02] font-extrabold text-[#6d2a96] mb-[4px] tracking-tight">
          Trajectplan Spoor 2 begeleiding
        </h1>
        <div className="space-y-[2px] max-w-[410px]">
          <CoverInfoLine label="Voor" value={employeeName} />
          <CoverInfoLine label="Datum rapportage" value={data.tp_creation_date || ''} />
          <CoverInfoLine label="Opdrachtgever" value={data.client_name || ''} />
        </div>
      </div>
    </A4Page>
  );
}

function CoverInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[138px_1fr] items-end border-b border-[#bda96f] text-[11px] text-[#6d2a96] leading-tight py-0.5">
      <span className="font-semibold">{label}</span>
      <span className="text-[#6b6b6b] truncate">{value || '—'}</span>
    </div>
  );
}
