'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';
import { Cover2026A4 } from '@/components/tp2026/sections/Cover2026Section';
import { Gegevens2026A4Pages } from '@/components/tp2026/sections/Gegevens2026Section';
import { Basis2026A4Pages } from '@/components/tp2026/Basis2026A4Measured';
import { Bijlage1A4Pages } from '@/components/tp2026/sections/Bijlage1Section';
import { TP2026PageNumberProvider } from '@/context/TP2026PageNumberContext';

type Props = { data: Record<string, any> };

export default function TP2026PrintableClient({ data: raw }: Props) {
  const data = ensureTP2026Shape(raw || {});
  const [basisReady, setBasisReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      console.warn('TP2026 print: basis pagination fallback (timeout)');
      setBasisReady(true);
    }, 10000);
    return () => window.clearTimeout(id);
  }, []);

  const onBasisPaginationReady = useCallback(() => setBasisReady(true), []);

  return (
    <TP2026PageNumberProvider>
      <div id="tp-print-root" className="tp-print-root" data-ready={basisReady ? '1' : '0'}>
        <section className="print-page">
          <Cover2026A4 data={data} />
        </section>
        <Gegevens2026A4Pages data={data} printMode />
        <Basis2026A4Pages data={data} printMode onPaginationReady={onBasisPaginationReady} />
        <Bijlage1A4Pages data={data} phases={data.bijlage1_phases || []} printMode />
      </div>
    </TP2026PageNumberProvider>
  );
}
