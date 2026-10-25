'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { VGRPageNumberProvider } from '@/context/VGRPageNumberContext';
import { CoverA4 } from '@/components/vgr/sections/CoverSection';
import { GegevensA4Pages } from '@/components/vgr/sections/GegevensSection';
import { BodyA4Pages } from '@/components/vgr/sections/BodySection';
import { PlanningA4Pages } from '@/components/vgr/sections/PlanningSection';
import { ApplicationsA4Pages } from '@/components/vgr/sections/ApplicationsSection';

type Props = { data: Record<string, any> };

/**
 * Full VGR print order: 01 cover → 02 gegevens → 03 body → 04 Bijlage 1 → 05 Bijlage 2.
 * `data-ready="1"` is only set after the measured sections (gegevens, body) have paginated,
 * with a 10 s fallback so export never hangs.
 */
export default function VGRPrintableClient({ data: raw }: Props) {
  const data = useMemo(() => ensureVGRShape(raw || {}), [raw]);
  const [gegevensReady, setGegevensReady] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      console.warn('VGR print: pagination fallback (timeout)');
      setGegevensReady(true);
      setBodyReady(true);
    }, 10000);
    return () => window.clearTimeout(id);
  }, []);

  const onGegevensReady = useCallback(() => setGegevensReady(true), []);
  const onBodyReady = useCallback(() => setBodyReady(true), []);

  return (
    <VGRPageNumberProvider>
      <div id="vgr-print-root" className="vgr-print-root tp-print-root" data-ready={gegevensReady && bodyReady ? '1' : '0'}>
        <section className="print-page">
          <CoverA4 data={data} />
        </section>
        <GegevensA4Pages data={data} printMode onPaginationReady={onGegevensReady} />
        <BodyA4Pages data={data} printMode onPaginationReady={onBodyReady} />
        <PlanningA4Pages data={data} printMode />
        <ApplicationsA4Pages data={data} printMode />
      </div>
    </VGRPageNumberProvider>
  );
}
