'use client';

import React from 'react';
import { Spoor2SubsectionUnit } from '@/components/tp2026/Spoor2SectionUnits';
import {
  TP_SPOOR2_SUBSECTIONS,
  TP_SPOOR2_TOELICHTING_BODY,
} from '@/lib/tp2026/basis-spoor2-begeleiding';

/** Full static "Onderdelen Spoor 2 begeleiding" section (basis document). */
export function BasisSpoor2Block({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <div className="mt-8">
        <Spoor2SubsectionUnit
          showMainBand
          showSubsectionTitle={false}
          subsectionTitle=""
          body={TP_SPOOR2_TOELICHTING_BODY}
        />
      </div>
      {TP_SPOOR2_SUBSECTIONS.map((sub) => (
        <div key={sub.id} className="mt-4">
          <Spoor2SubsectionUnit
            showSubsectionTitle
            subsectionTitle={sub.title}
            body={sub.body}
          />
        </div>
      ))}
    </div>
  );
}
