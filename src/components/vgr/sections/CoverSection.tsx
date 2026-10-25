'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Logo2 from '@/assets/images/logo-2.png';
import { A4Page } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';
import { DocumentEmployerNameField } from '@/components/tp2026/DocumentEmployerNameField';
import { TP2026_LOGO } from '@/lib/tp2026/document-layout';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import { getWerkgeverName } from '@/lib/tp/resolve-profile-context';
import { formatEmployeeName } from '@/lib/utils';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { VGR_COVER_PAGE_COUNT } from '@/lib/vgr/page-numbering';
import { VGR_COVER_TITLE } from '@/lib/vgr/content';
import type { VGRData } from '@/lib/vgr/schema';

/* Geometry mirrors TP2026 `Cover2026Section` so both documents share one visual language. */
const COVER_ARTWORK_VERTICAL_NUDGE_PX = 50;
const COVER_ARTWORK_SCALE = 1.04;

const COVER_LAYOUT = {
  pageBg: '#cfbf8dff',
  logo: { left: TP2026_LOGO.leftPx, top: TP2026_LOGO.topPx, w: TP2026_LOGO.widthPx, h: TP2026_LOGO.heightPx },
  artwork: { image: '/tp2026-cover-visual.svg', size: '100% auto', position: 'center center' },
  banner: { y: 508, h: 192, px: 214, py: 0, contentOpticalShiftPx: -40 },
  title: { fontSize: '20pt', lineHeight: 1.08, mb: 14 },
  fields: { maxW: 520, rowGap: 5, labelW: 132, fontSize: '8.5pt', purple: '#6d2a96', borderColor: '#b8985c' },
} as const;

export function CoverEditor({
  data,
  updateField,
  updateMeta,
}: {
  data: VGRData;
  updateField: (key: string, value: any) => void;
  updateMeta: (patch: Partial<VGRData['vgr_meta']>) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldControl
        field={{ key: 'first_name', label: 'Voornaam', type: 'text' }}
        value={data.first_name}
        onChange={(v) => updateField('first_name', v)}
      />
      <FieldControl
        field={{ key: 'last_name', label: 'Achternaam', type: 'text' }}
        value={data.last_name}
        onChange={(v) => updateField('last_name', v)}
      />
      <FieldControl
        field={{ key: 'report_date', label: 'Datum rapportage', type: 'date' }}
        value={data.vgr_meta.report_date}
        onChange={(v) => updateMeta({ report_date: v })}
      />
      <DocumentEmployerNameField data={data} updateField={updateField} />
      <p className="text-xs text-muted-foreground">
        De rapportagedatum is specifiek voor deze voortgangsrapportage en staat los van de datum van het trajectplan.
      </p>
    </div>
  );
}

export function CoverA4({ data }: { data: VGRData }) {
  const { setSectionPageCount } = useVGRPageNumber();

  useEffect(() => {
    setSectionPageCount('cover', VGR_COVER_PAGE_COUNT);
  }, [setSectionPageCount]);

  const employeeName =
    data.first_name && data.last_name
      ? formatEmployeeName(data.first_name, data.last_name, data.gender)
      : [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || '—';

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
              {VGR_COVER_TITLE}
            </h1>
            <div style={{ rowGap: COVER_LAYOUT.fields.rowGap }} className="grid text-[#6d2a96] leading-tight">
              <CoverInfoLine label="Voor" value={employeeName} />
              <CoverInfoLine label="Datum rapportage" value={formatNLDateForDoc(data.vgr_meta.report_date)} />
              <CoverInfoLine label="Opdrachtgever" value={getWerkgeverName(data)} />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute z-20 pointer-events-none" style={{ left: COVER_LAYOUT.logo.left, top: COVER_LAYOUT.logo.top }}>
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
      style={{ gridTemplateColumns: `${COVER_LAYOUT.fields.labelW}px 1fr`, borderColor: COVER_LAYOUT.fields.borderColor }}
    >
      <span className="antialiased whitespace-nowrap" style={{ fontSize: fs, color: purple, fontWeight: 800 }}>
        {label}
      </span>
      <span className="antialiased" style={{ fontSize: fs, color: purple, fontWeight: 400 }}>
        {display}
      </span>
    </div>
  );
}
