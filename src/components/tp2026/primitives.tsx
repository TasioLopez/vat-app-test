import React from 'react';
import Image from 'next/image';
import Logo2 from '@/assets/images/logo-2.png';

export const A4_W = 794;
export const A4_H = 1123;

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
      style={{ width: A4_W, height: A4_H, ...style }}
    >
      {children}
    </div>
  );
}

export function A4LogoHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`w-full flex justify-start ${compact ? 'mb-2' : 'mb-4'}`}>
      <Image src={Logo2} alt="ValentineZ" width={compact ? 120 : 150} height={compact ? 40 : 50} />
    </div>
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
    <div className="mt-auto border-t border-[#b8985c] text-[10px] text-[#5a4a66] px-8 py-2 flex items-end justify-between gap-4">
      <div className="flex flex-col gap-0.5 text-left leading-tight">
        <div>Naam: {name}</div>
        <div>Geboortedatum: {dateOfBirth || '—'}</div>
      </div>
      <div className="shrink-0 self-end text-[#6d2a96] font-semibold tabular-nums">
        {typeof pageNumber === 'number' ? pageNumber : ''}
      </div>
    </div>
  );
}

/** Section title: plain bold purple on white (Word template style, no tan band). */
export function SectionBand({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div className={`text-[#6d2a96] font-bold text-[12px] leading-tight mb-2 ${className}`}>
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

/** Two-column form row for TP 2026 A4 (~1:3 label:value, tan rules). */
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
    <div className={`grid grid-cols-[1fr_3fr] ${size} leading-snug`}>
      <div className="px-2 py-1 font-bold text-[#6d2a96] bg-[#f5efe6] border-r border-[#b8985c] align-top">
        {label}
      </div>
      <div className="px-2 py-1 font-normal text-neutral-900 bg-white">{value}</div>
    </div>
  );
}
