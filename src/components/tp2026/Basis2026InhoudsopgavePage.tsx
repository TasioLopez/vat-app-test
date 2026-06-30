'use client';

import React from 'react';
import {
  A4LogoHeader,
  A4Page,
  FooterIdentity,
  TP2026_A4_PAGE_CLASS,
  ValentineZLogoBulletRow,
} from '@/components/tp2026/primitives';
import { formatNLDate } from '@/lib/tp2026/schema';
import {
  BASIS_INHOUDSOPGAVE_INTRO_ITEMS,
  BASIS_INHOUDSOPGAVE_SECTIONS,
  BASIS_INHOUDSOPGAVE_TITLE,
  type BasisInhoudsopgaveBarVariant,
} from '@/lib/tp2026/basis-inhoudsopgave-static';

const BAR_BG: Record<BasisInhoudsopgaveBarVariant, string> = {
  purple: 'bg-[#5a257d]',
  salmon: 'bg-[#c76f5c]',
  beige: 'bg-[#c4a574]',
};

const tocItemClass = 'text-[12px] leading-snug text-[#6d2a96]';

function TocSectionBar({
  variant,
  title,
}: {
  variant: BasisInhoudsopgaveBarVariant;
  title: string;
}) {
  return (
    <div
      className={`-mx-4 px-4 py-2.5 text-[15px] font-bold leading-tight text-white ${BAR_BG[variant]}`}
    >
      {title}
    </div>
  );
}

export function Basis2026InhoudsopgavePage({
  data,
  pageNumber,
}: {
  data: Record<string, any>;
  pageNumber: number;
}) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex flex-col`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col text-[12px]">
        <h1 className="text-[16px] font-bold leading-tight text-[#6d2a96]">{BASIS_INHOUDSOPGAVE_TITLE}</h1>
        <div className="mt-3 space-y-1">
          {BASIS_INHOUDSOPGAVE_INTRO_ITEMS.map((item) => (
            <ValentineZLogoBulletRow key={item}>
              <span className={tocItemClass}>{item}</span>
            </ValentineZLogoBulletRow>
          ))}
        </div>

        {BASIS_INHOUDSOPGAVE_SECTIONS.map((section) => (
          <div key={section.title} className="mt-4">
            <TocSectionBar variant={section.barVariant} title={section.title} />
            <div className="mt-2 space-y-1">
              {section.items.map((item) => (
                <ValentineZLogoBulletRow key={item}>
                  <span className={tocItemClass}>{item}</span>
                </ValentineZLogoBulletRow>
              ))}
            </div>
          </div>
        ))}
      </div>
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={pageNumber}
      />
    </A4Page>
  );
}
