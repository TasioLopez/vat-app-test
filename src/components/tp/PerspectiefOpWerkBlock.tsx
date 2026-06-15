'use client';

import React from 'react';
import { BasisToelichtingHeading } from '@/components/tp2026/primitives';
import {
  PERSPECTIEF_OP_WERK_MISSION,
  PERSPECTIEF_OP_WERK_NULMETING,
  PERSPECTIEF_OP_WERK_POW_INTRO,
} from '@/lib/tp/pow-meter/constants';

/**
 * Static "Perspectief op werk" block: mission + POW-meter™ subheading + explanatory paragraphs.
 */
export function PerspectiefOpWerkBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`text-[12px] leading-relaxed text-neutral-900 ${className}`}>
      <p>{PERSPECTIEF_OP_WERK_MISSION}</p>
      <div className="mt-4">
        <BasisToelichtingHeading label="POW-meter™" />
        <p className="mt-1">{PERSPECTIEF_OP_WERK_POW_INTRO}</p>
        <p className="mt-3">{PERSPECTIEF_OP_WERK_NULMETING}</p>
      </div>
    </div>
  );
}
