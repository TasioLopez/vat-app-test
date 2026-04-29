'use client';

import Image from 'next/image';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026CoverFields } from '@/lib/tp2026/schema';
import { A4Page } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';
import Logo2 from '@/assets/images/logo-2.png';

const COVER_LAYOUT = {
  pageBg: '#c8bd90',
  artwork: {
    image: '/tp2026-cover-original.svg',
    /**
     * Fill the A4 canvas so the visible artwork (Z + banner) reaches full page width.
     * Plain `100% auto` only matches the SVG viewBox width, which includes transparent
     * side gutters — that leaves the cream banner narrower than the page.
     */
    size: 'cover',
    position: 'center 42%',
  },
  logo: {
    x: 66,
    y: 50,
    w: 162,
    h: 41,
  },
  banner: {
    y: 518,
    h: 98,
    px: 188,
    py: 10,
  },
  title: {
    size: 31,
    lineHeight: 1.02,
    mb: 4,
  },
  fields: {
    maxW: 420,
    gap: 2,
    labelW: 138,
    fontSize: 11,
  },
} as const;

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
    <A4Page className="relative" style={{ backgroundColor: COVER_LAYOUT.pageBg }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${COVER_LAYOUT.artwork.image})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: COVER_LAYOUT.artwork.size,
          backgroundPosition: COVER_LAYOUT.artwork.position,
        }}
      />
      <div
        className="absolute"
        style={{
          left: COVER_LAYOUT.logo.x,
          top: COVER_LAYOUT.logo.y,
        }}
      >
        <Image src={Logo2} alt="ValentineZ" width={COVER_LAYOUT.logo.w} height={COVER_LAYOUT.logo.h} />
      </div>

      <div
        className="absolute left-0 right-0 box-border"
        style={{
          top: COVER_LAYOUT.banner.y,
          height: COVER_LAYOUT.banner.h,
          paddingLeft: COVER_LAYOUT.banner.px,
          paddingRight: COVER_LAYOUT.banner.px,
          paddingTop: COVER_LAYOUT.banner.py,
          paddingBottom: COVER_LAYOUT.banner.py,
        }}
      >
        <h1
          className="font-extrabold text-[#6d2a96] tracking-tight"
          style={{
            fontSize: COVER_LAYOUT.title.size,
            lineHeight: COVER_LAYOUT.title.lineHeight,
            marginBottom: COVER_LAYOUT.title.mb,
          }}
        >
          Trajectplan Spoor 2 begeleiding
        </h1>
        <div style={{ maxWidth: COVER_LAYOUT.fields.maxW, rowGap: COVER_LAYOUT.fields.gap }} className="grid">
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
    <div
      className="grid items-end border-b border-[#bda96f] text-[#6d2a96] leading-tight py-0.5"
      style={{
        gridTemplateColumns: `${COVER_LAYOUT.fields.labelW}px 1fr`,
        fontSize: COVER_LAYOUT.fields.fontSize,
      }}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-[#6b6b6b] truncate">{value || '—'}</span>
    </div>
  );
}
