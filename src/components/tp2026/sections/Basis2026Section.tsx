'use client';

import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026BasisFields, formatNLDate } from '@/lib/tp2026/schema';
import { A4LogoHeader, A4Page, FooterIdentity, SectionBand, TP2026_A4_PAGE_CLASS } from '@/components/tp2026/primitives';
import FieldControl from '@/components/tp2026/FieldControl';

type Block = { key: string; title: string; text: string };

export function Basis2026Editor({
  data,
  updateField,
}: {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-3">
      {TP2026BasisFields.map((field: TP2026FieldDef) => (
        <FieldControl key={field.key} field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />
      ))}
    </div>
  );
}

function splitBlocksIntoPages(blocks: Block[], maxCharsPerPage = 5200): Block[][] {
  const pages: Block[][] = [];
  let current: Block[] = [];
  let used = 0;

  for (const block of blocks) {
    const blockCost = block.title.length + block.text.length + 200;
    if (current.length > 0 && used + blockCost > maxCharsPerPage) {
      pages.push(current);
      current = [block];
      used = blockCost;
    } else {
      current.push(block);
      used += blockCost;
    }
  }

  if (current.length > 0) pages.push(current);
  return pages;
}

function BasisPage({
  data,
  blocks,
  pageNumber,
}: {
  data: Record<string, any>;
  blocks: Block[];
  pageNumber: number;
}) {
  return (
    <A4Page className={TP2026_A4_PAGE_CLASS}>
      <A4LogoHeader />
      {blocks.map((block, idx) => (
        <div key={block.key} className={`mb-4 ${idx > 0 ? 'mt-7' : ''}`}>
          <SectionBand title={block.title} />
          <div className="border border-[#b8985c] p-3 text-[12px] leading-relaxed whitespace-pre-wrap bg-white text-neutral-900">
            {block.text || '— nog niet ingevuld —'}
          </div>
        </div>
      ))}

      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={pageNumber}
      />
    </A4Page>
  );
}

export function Basis2026A4Pages({
  data,
  printMode = false,
}: {
  data: Record<string, any>;
  printMode?: boolean;
}) {
  const blocks: Block[] = [
    { key: 'inleiding', title: 'Inleiding', text: data.inleiding || '' },
    { key: 'wettelijk', title: 'Wettelijke kaders en terminologie', text: data.inleiding_sub || '' },
    { key: 'sociale_achtergrond', title: 'Sociale achtergrond & maatschappelijke context', text: data.sociale_achtergrond || '' },
    { key: 'visie_werknemer', title: 'Visie van werknemer', text: data.visie_werknemer || '' },
    { key: 'persoonlijk_profiel', title: 'Persoonlijk profiel', text: data.persoonlijk_profiel || '' },
    { key: 'prognose_bedrijfsarts', title: 'Belastbaarheidsprofiel', text: data.prognose_bedrijfsarts || '' },
    { key: 'praktische_belemmeringen', title: 'Praktische belemmeringen', text: data.praktische_belemmeringen || '' },
    { key: 'advies_ad_passende_arbeid', title: 'Advies passende arbeid', text: data.advies_ad_passende_arbeid || '' },
    { key: 'pow_meter', title: 'Perspectief op werk / POW-meter', text: data.pow_meter || '' },
    { key: 'visie_plaatsbaarheid', title: 'Visie op plaatsbaarheid', text: data.visie_plaatsbaarheid || '' },
    { key: 'visie_loopbaanadviseur', title: 'Visie loopbaanadviseur', text: data.visie_loopbaanadviseur || '' },
    { key: 'zoekprofiel', title: 'Zoekprofiel', text: data.zoekprofiel || '' },
  ];

  const pages = splitBlocksIntoPages(blocks);
  return (
    <>
      {pages.map((pageBlocks, idx) => (
        printMode ? (
          <section className="print-page" key={idx}>
            <BasisPage data={data} blocks={pageBlocks} pageNumber={idx + 1} />
          </section>
        ) : (
          <div key={idx}>
            <BasisPage data={data} blocks={pageBlocks} pageNumber={idx + 1} />
          </div>
        )
      ))}
    </>
  );
}
