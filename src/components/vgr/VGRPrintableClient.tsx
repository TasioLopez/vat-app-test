'use client';

import { ensureVGRShape } from '@/lib/vgr/mapping';
import { Bijlage2A4Pages } from '@/components/vgr/sections/Bijlage2Section';
import { Bijlage3A4Pages } from '@/components/vgr/sections/Bijlage3Section';
import { VGRPageNumberProvider } from '@/context/VGRPageNumberContext';

type Props = { data: Record<string, any> };

export default function VGRPrintableClient({ data: raw }: Props) {
  const data = ensureVGRShape(raw || {});

  return (
    <VGRPageNumberProvider>
      <div id="vgr-print-root" className="vgr-print-root tp-print-root" data-ready="1">
        <Bijlage2A4Pages data={data} model={data.bijlage2_model} printMode />
        <Bijlage3A4Pages
          data={data}
          decisions={data.bijlage3_decisions || []}
          page2={data.bijlage3_page2 || {}}
          printMode
        />
      </div>
    </VGRPageNumberProvider>
  );
}
