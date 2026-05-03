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
      className={`bg-white w-[794px] h-[1123px] border border-border shadow-sm print:shadow-none print:border-0 overflow-hidden ${className}`}
      style={{ width: A4_W, height: A4_H, ...style }}
    >
      {children}
    </div>
  );
}

export function A4LogoHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`w-full flex justify-start ${compact ? 'mb-2' : 'mb-6'}`}>
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
    <div className="mt-auto border-t border-[#b8985c] text-[10px] text-[#5a4a66] px-8 py-2 flex items-center justify-between">
      <div>Naam: {name}</div>
      <div className="text-[#6d2a96] font-semibold">{typeof pageNumber === 'number' ? pageNumber : ''}</div>
      <div>Geboortedatum: {dateOfBirth || '—'}</div>
    </div>
  );
}

/** Section header strip aligned with TP 2026 print template (tan + purple). */
export function SectionBand({ title }: { title: string }) {
  return (
    <div className="bg-[#ebe1cf] text-[#6d2a96] font-bold text-[12px] tracking-tight px-3 py-2 border-y border-[#b8985c]">
      {title}
    </div>
  );
}

/** Two-column form row for TP 2026 A4 (purple labels, tan rules). */
export function DataRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[220px_1fr] border-b border-[#b8985c] ${compact ? 'text-[11px]' : 'text-[12px]'} leading-snug`}
    >
      <div className="px-3 py-1.5 font-semibold text-[#6d2a96] bg-[#f5efe6] border-r border-[#b8985c]/80">
        {label}
      </div>
      <div className="px-3 py-1.5 text-[#4a3a52] bg-white">{value}</div>
    </div>
  );
}
