'use client';

import React from 'react';
import {
  TP_BASIS_AGREEMENT_INTRO,
  TP_BASIS_AGREEMENT_POINTS,
} from '@/lib/tp2026/basis-document-agreement';
import { TP_BASIS_DISCLAIMER_CLASS } from '@/lib/tp2026/basis-document-layout';
import { ValentineZLogoBulletRow } from '@/components/tp2026/primitives';

const paperText =
  'bg-[#f5efe6] p-2.5 text-[11px] leading-relaxed text-neutral-900';

export function BasisAgreementBlock() {
  return (
    <div className="mb-2 mt-3">
      <SectionBand title={TP_BASIS_AGREEMENT_INTRO} />
      <div className={paperText}>
        <div className="ml-1 space-y-1.5">
          {TP_BASIS_AGREEMENT_POINTS.map((t, i) => (
            <ValentineZLogoBulletRow key={i}>
              {t}
            </ValentineZLogoBulletRow>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatEmployerLine(name: string, jobTitle?: string): string {
  const contact = String(name || '').trim();
  const role = String(jobTitle || '').trim();
  if (contact && role) return `${contact}, ${role}`;
  return contact || role;
}

function SignatureCell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tp2026-field-table rounded p-2">
      <div className="mb-1 text-[13px] font-bold text-[#6d2a96]">{title}</div>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-neutral-900">{children}</div>
    </div>
  );
}

export function BasisSignatureBlock({
  employeeName,
  advisorName,
  employerContact,
  employerFunction,
}: {
  employeeName: string;
  advisorName: string;
  employerContact: string;
  employerFunction?: string;
}) {
  const row = 'mt-3 grid grid-cols-2 gap-3';
  const employerLine = formatEmployerLine(employerContact, employerFunction);

  return (
    <div className="mb-2 mt-3">
      <SectionBand title="Ondertekening" className="mb-0" />
      <div className="whitespace-pre-wrap px-2 pb-2 text-[12px] leading-relaxed text-neutral-900">
        <div className="grid grid-cols-2 gap-3">
          <SignatureCell title="Werknemer">
            <div>{employeeName}</div>
            <div className="min-h-2" aria-hidden />
            <div className="min-h-8" aria-hidden />
          </SignatureCell>
          <SignatureCell title="Valentine Z">
            <div>{advisorName}</div>
            <div className="min-h-2" aria-hidden />
            <div className="min-h-8" aria-hidden />
          </SignatureCell>
        </div>
        <div className={row}>
          <SignatureCell title="Opdrachtgever">
            <div>{employerLine}</div>
            <div className="min-h-2" aria-hidden />
            <div className="min-h-8" aria-hidden />
          </SignatureCell>
          <div />
        </div>
        <p className={`mt-4 ${TP_BASIS_DISCLAIMER_CLASS}`}>
          Voor alle volledige informatie verwijzen wij u graag naar ons privacyreglement en ons
          klachtenreglement op onze website{' '}
          <a
            href="https://www.valentinez.nl"
            className="text-[#6d2a96] underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.valentinez.nl
          </a>
          . Een papieren versie kunt u opvragen via 085 - 800 2010 of{' '}
          <a
            href="mailto:info@valentinez.nl"
            className="text-[#6d2a96] underline underline-offset-2"
          >
            info@valentinez.nl
          </a>
          .
        </p>
      </div>
    </div>
  );
}
