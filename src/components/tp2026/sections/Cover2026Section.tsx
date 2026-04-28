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

function CoverInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-end border-b border-[#bda96f] text-[11px] text-[#6d2a96] leading-tight py-0.5">
      <span className="font-semibold">{label}</span>
      <span className="text-[#6b6b6b]">{value || '—'}</span>
    </div>
  );
}

export function Cover2026A4({ data }: { data: Record<string, any> }) {
  const employeeName =
    data.employee_name ||
    [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
    '—';

  return (
    <A4Page className="relative bg-[#c8bd90]">
      <Image
        src="/tp2026-cover-original.svg"
        alt="TP 2026 cover background"
        fill
        priority
        style={{
          objectFit: 'fill',
          objectPosition: 'center top',
          transform: 'scaleX(1.4142)',
          transformOrigin: 'center top',
        }}
      />

      <div className="absolute left-[78px] top-[58px]">
        <Image src={Logo2} alt="ValentineZ" width={165} height={42} />
      </div>

      <div className="absolute left-0 right-0 top-[476px] h-[164px] bg-[#f5efe6] border-y border-[#ccb98f] flex items-center px-[70px]">
        <div className="w-[90px] h-[90px] rounded-full flex items-center justify-center mr-10">
          <Image src="/tp2026-cover-icon.svg" alt="Cover icon" width={88} height={88} />
        </div>
        <div className="flex-1">
          <h1 className="text-[30px] leading-[1.04] font-extrabold text-[#6d2a96] mb-2 tracking-tight">
            Trajectplan Spoor 2 begeleiding
          </h1>
          <div className="max-w-[520px]">
            <CoverInfoLine label="Voor" value={employeeName} />
            <CoverInfoLine label="Datum rapportage" value={data.tp_creation_date || ''} />
            <CoverInfoLine label="Opdrachtgever" value={data.client_name || ''} />
          </div>
        </div>
      </div>
    </A4Page>
  );
}
