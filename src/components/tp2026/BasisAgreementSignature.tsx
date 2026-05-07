'use client';

import React from 'react';
import {
  TP_BASIS_AGREEMENT_FOOTER_1,
  TP_BASIS_AGREEMENT_FOOTER_2,
  TP_BASIS_AGREEMENT_INTRO,
  TP_BASIS_AGREEMENT_POINTS,
} from '@/lib/tp2026/basis-document-agreement';
import { SectionBand } from '@/components/tp2026/primitives';

const paperText =
  'border border-[#b8985c] bg-[#f5efe6] p-2.5 text-[12px] leading-relaxed text-neutral-900';

export function BasisAgreementBlock() {
  return (
    <div className="mb-2 mt-3">
      <SectionBand title="Akkoordverklaring" underline />
      <div className={paperText}>
        <p className="mb-2">{TP_BASIS_AGREEMENT_INTRO}</p>
        <div className="ml-1 space-y-1.5">
          {TP_BASIS_AGREEMENT_POINTS.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/val-logo.jpg" alt="" width={14} height={14} className="mt-0.5 shrink-0" />
              <span>{t}</span>
            </div>
          ))}
        </div>
        <p className="mt-3">{TP_BASIS_AGREEMENT_FOOTER_1}</p>
        <p className="mt-2">
          {TP_BASIS_AGREEMENT_FOOTER_2.text}
          <span className="underline">{TP_BASIS_AGREEMENT_FOOTER_2.link1}</span>
          {TP_BASIS_AGREEMENT_FOOTER_2.middle}
          <span className="underline">{TP_BASIS_AGREEMENT_FOOTER_2.link2}</span>
          {TP_BASIS_AGREEMENT_FOOTER_2.end}
        </p>
      </div>
    </div>
  );
}

export function BasisSignatureBlock({
  employeeName,
  advisorName,
  employerContact,
  employerFunctionCompany,
}: {
  employeeName: string;
  advisorName: string;
  employerContact: string;
  employerFunctionCompany?: string;
}) {
  const row = 'mt-3 grid grid-cols-2 gap-4';
  const cell = 'rounded border border-[#b8985c] bg-[#f5efe6] p-3';
  const line = 'inline-block min-w-[140px] border-b border-neutral-900';
  const label = 'text-[10px] font-bold text-neutral-600';
  return (
    <div className="mb-2 mt-3">
      <SectionBand title="Ondertekening" underline />
      <div className="whitespace-pre-wrap p-2 text-[12px] leading-relaxed text-neutral-900">
        <div className={row}>
          <div className={cell}>
            <div className="mb-1 font-semibold">Werknemer</div>
            <div className="mb-1">
              <span className={label}>Naam: </span>
              <span className={line}>{employeeName}</span>
            </div>
            <div className="mb-1">
              <span className={label}>Datum: </span>
              <span className={line} />
            </div>
            <div className="min-h-14 pt-1">
              <span className={label}>Handtekening: </span>
              <span className={line} />
            </div>
          </div>
          <div className={cell}>
            <div className="mb-1 font-semibold">Loopbaanadviseur</div>
            <div className="mb-1">
              <span className={label}>Naam: </span>
              <span className={line}>{advisorName}</span>
            </div>
            <div className="mb-1">
              <span className={label}>Datum: </span>
              <span className={line} />
            </div>
            <div className="min-h-14 pt-1">
              <span className={label}>Handtekening: </span>
              <span className={line} />
            </div>
          </div>
        </div>
        <div className={row}>
          <div className={cell}>
            <div className="mb-1 font-semibold">Opdrachtgever</div>
            <div className="mb-1">
              <span className={label}>Naam: </span>
              <span className={line}>{employerContact}</span>
            </div>
            {employerFunctionCompany ? (
              <div className="mb-1">
                <span className={label}>Functie, bedrijf: </span>
                <span className={line}>{employerFunctionCompany}</span>
              </div>
            ) : null}
            <div className="mb-1">
              <span className={label}>Datum: </span>
              <span className={line} />
            </div>
            <div className="min-h-14 pt-1">
              <span className={label}>Handtekening: </span>
              <span className={line} />
            </div>
          </div>
          <div />
        </div>
      </div>
    </div>
  );
}
