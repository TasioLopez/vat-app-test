import React from 'react';
import { ensureTP2026Shape } from '@/lib/tp2026/mapping';
import { Cover2026A4 } from '@/components/tp2026/sections/Cover2026Section';
import { Gegevens2026A4Pages } from '@/components/tp2026/sections/Gegevens2026Section';
import { Basis2026A4Pages } from '@/components/tp2026/sections/Basis2026Section';
import {
  Bijlage1A4Pages,
  Bijlage2A4Pages,
  Bijlage3A4Pages,
} from '@/components/tp2026/sections/Bijlage2026Sections';

type Props = { data: Record<string, any> };

export default function TP2026Printable({ data: raw }: Props) {
  const data = ensureTP2026Shape(raw || {});
  return (
    <div id="tp-print-root" className="tp-print-root" data-ready="1">
      <section className="print-page">
        <Cover2026A4 data={data} />
      </section>
      <Gegevens2026A4Pages data={data} printMode />
      <Basis2026A4Pages data={data} printMode />
      <Bijlage1A4Pages data={data} phases={data.bijlage1_phases || []} printMode />
      <Bijlage2A4Pages data={data} model={data.bijlage2_model} printMode />
      <Bijlage3A4Pages
        data={data}
        decisions={data.bijlage3_decisions || []}
        page2={data.bijlage3_page2 || {}}
        printMode
      />
    </div>
  );
}
