import React from 'react';
import Image from 'next/image';
import Logo2 from '@/assets/images/logo-2.png';
import { TP2026_BODY_FLOW_START_SPACER_PX, TP2026_LOGO } from '@/lib/tp2026/document-layout';

export const A4_W = 794;
export const A4_H = 1123;

/**
 * Body pages: ~1in horizontal margins (`px-24` = {@link TP2026_BODY_MARGIN_X_PX}),
 * cover-aligned absolute logo (no top padding — logo uses `TP2026_LOGO.topPx`).
 */
export const TP2026_A4_PAGE_CLASS = 'relative flex flex-col min-h-0 pb-8 px-24';

export function A4Page({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`bg-white w-[794px] h-[1123px] border border-zinc-300 shadow-sm print:shadow-none print:border-0 overflow-hidden ${className}`}
      style={{
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function A4LogoHeader({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mb-2 flex w-full justify-start">
        <Image src={Logo2} alt="ValentineZ" width={120} height={40} />
      </div>
    );
  }

  const { leftPx, topPx, widthPx, heightPx } = TP2026_LOGO;
  return (
    <>
      <div
        className="pointer-events-none absolute z-10 flex flex-col items-start"
        style={{ left: leftPx, top: topPx }}
      >
        <Image src={Logo2} alt="ValentineZ" width={widthPx} height={heightPx} />
        <p className="mt-1.5 text-[10px] leading-tight tracking-wide text-[#6d2a96]">jouw werk is ons werk</p>
      </div>
      <div className="shrink-0" style={{ height: TP2026_BODY_FLOW_START_SPACER_PX }} aria-hidden />
    </>
  );
}

export function FooterIdentity({
  lastName,
  firstName,
  dateOfBirth,
  pageNumber,
}: {
  lastName?: string | null;
  firstName?: string | null;
  dateOfBirth?: string | null;
  pageNumber?: number;
}) {
  const name = [lastName, firstName].filter(Boolean).join(' ') || '—';
  return (
    <div className="mt-auto border-t border-[#b8985c] py-2.5">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 text-[10px] leading-tight text-neutral-900">
        <div className="flex flex-col gap-1 text-left">
          <div>
            <span className="font-normal">Naam: </span>
            <span className="text-neutral-800">{name}</span>
          </div>
          <div>
            <span className="font-normal">Geboortedatum: </span>
            <span className="text-neutral-800">{dateOfBirth || '—'}</span>
          </div>
        </div>
        <div className="text-[#6d2a96] font-semibold tabular-nums pt-px">
          {typeof pageNumber === 'number' ? pageNumber : ''}
        </div>
      </div>
    </div>
  );
}

/** Section title: plain bold purple on white (Word template style, no tan band). */
export function SectionBand({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div className={`text-[#6d2a96] font-bold text-[12px] leading-tight mb-1.5 ${className}`}>
      {title}
    </div>
  );
}

/** Bordered field table: full outer frame + horizontal rules between rows (template-style grid). */
export function TP2026FieldTable({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col border border-[#b8985c] divide-y divide-[#b8985c] ${className}`}
    >
      {children}
    </div>
  );
}

/** Two-column form row for TP 2026 A4 (~35% / 65%, Word-style). */
export function DataRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  const size = compact ? 'text-[11px]' : 'text-[12px]';
  return (
    <div className={`grid grid-cols-[35%_65%] ${size} leading-snug`}>
      <div className="px-2.5 py-1.5 font-bold text-[#6d2a96] bg-[#ebe1cf] border-r border-[#b8985c] align-top">
        {label}
      </div>
      <div className="px-2.5 py-1.5 font-normal text-neutral-900 bg-white">{value}</div>
    </div>
  );
}
