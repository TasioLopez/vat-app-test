'use client';

import Image from 'next/image';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026CoverFields } from '@/lib/tp2026/schema';
import Logo2 from '@/assets/images/logo-2.png';
import { A4Page } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';

/**
 * Positive = shift artwork (and banner) slightly below strict vertical center on A4,
 * matching `01_Trajectplan_voorkant` (more margin above the Z than below).
 */
const COVER_ARTWORK_VERTICAL_NUDGE_PX = 50;
/** Uniform scale for SVG + banner overlay (keeps cream band aligned with text). */
const COVER_ARTWORK_SCALE = 1.04;

const COVER_LAYOUT = {
  pageBg: '#cfbf8dff',
  /** Top-left logo: margins + alignment with reference `01_Trajectplan_voorkant` (above Z, clear inset from page edges). */
  logo: {
    left: 76,
    top: 54,
    w: 165,
    h: 55,
  },
  artwork: {
    /** Cropped vector asset (no transparent viewBox gutters). */
    image: '/tp2026-cover-visual.svg',
    /** Width-anchored: artwork fills page width; height follows aspect ratio. */
    size: '100% auto',
    /** Geometric vertical center; use {@link COVER_ARTWORK_VERTICAL_NUDGE_PX} for doc-accurate offset. */
    position: 'center center',
  },
  /** Band geometry; `y` is page coords inside the scaled wrapper (nudge applied on wrapper, not added here). */
  banner: {
    y: 508,
    h: 192,
    /** More inset from the baked-in circular icon in the SVG (matches reference spacing). */
    px: 214,
    /** Symmetric; vertical balance comes from flex `my-auto` on inner block. */
    py: 0,
    /** Negative = move title+fields up inside the cream strip (preview is scaled; needs larger steps to read). */
    contentOpticalShiftPx: -56,
  },
  /** Matches Google Docs `01_Trajectplan_voorkant` (pt for print parity). */
  title: {
    fontSize: '20pt',
    lineHeight: 1.08,
    mb: 14,
  },
  fields: {
    maxW: 520,
    rowGap: 5,
    /** Wide enough for "Datum rapportage" on one line at 8.5pt bold */
    labelW: 132,
    fontSize: '8.5pt',
    purple: '#6d2a96',
    borderColor: '#b8985c',
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
        className="absolute inset-0"
        style={{
          transformOrigin: 'center center',
          transform: `translateY(${COVER_ARTWORK_VERTICAL_NUDGE_PX}px) scale(${COVER_ARTWORK_SCALE})`,
        }}
      >
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
          className="absolute left-0 right-0 box-border flex min-h-0 flex-col"
          style={{
            top: COVER_LAYOUT.banner.y,
            height: COVER_LAYOUT.banner.h,
            paddingLeft: COVER_LAYOUT.banner.px,
            paddingRight: COVER_LAYOUT.banner.px,
            paddingTop: COVER_LAYOUT.banner.py,
            paddingBottom: COVER_LAYOUT.banner.py,
          }}
        >
          <div
            className="w-full shrink-0 my-auto"
            style={{
              maxWidth: COVER_LAYOUT.fields.maxW,
              transform: `translateY(${COVER_LAYOUT.banner.contentOpticalShiftPx}px)`,
            }}
          >
            <h1
              className="m-0 tracking-tight text-[#6d2a96] antialiased"
              style={{
                fontSize: COVER_LAYOUT.title.fontSize,
                lineHeight: COVER_LAYOUT.title.lineHeight,
                marginBottom: COVER_LAYOUT.title.mb,
                whiteSpace: 'nowrap',
                fontWeight: 900,
              }}
            >
              Trajectplan Spoor 2 begeleiding
            </h1>
            <div
              style={{ rowGap: COVER_LAYOUT.fields.rowGap }}
              className="grid text-[#6d2a96] leading-tight"
            >
              <CoverInfoLine label="Voor" value={employeeName} />
              <CoverInfoLine label="Datum rapportage" value={data.tp_creation_date || ''} />
              <CoverInfoLine label="Opdrachtgever" value={data.client_name || ''} />
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: COVER_LAYOUT.logo.left,
          top: COVER_LAYOUT.logo.top,
        }}
      >
        <Image src={Logo2} alt="ValentineZ" width={COVER_LAYOUT.logo.w} height={COVER_LAYOUT.logo.h} priority />
      </div>
    </A4Page>
  );
}

function CoverInfoLine({ label, value }: { label: string; value: string }) {
  const display = value?.trim() ? value : '—';
  const fs = COVER_LAYOUT.fields.fontSize;
  const purple = COVER_LAYOUT.fields.purple;
  return (
    <div
      className="grid items-baseline border-b leading-tight py-[4px]"
      style={{
        gridTemplateColumns: `${COVER_LAYOUT.fields.labelW}px 1fr`,
        borderColor: COVER_LAYOUT.fields.borderColor,
      }}
    >
      <span className="antialiased whitespace-nowrap" style={{ fontSize: fs, color: purple, fontWeight: 800 }}>
        {label}
      </span>
      <span className="truncate antialiased" style={{ fontSize: fs, color: purple, fontWeight: 400 }}>
        {display}
      </span>
    </div>
  );
}
