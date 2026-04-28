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
    <div className="mt-auto border-t border-[#c9b88a] text-[10px] text-[#4b4b4b] px-8 py-2 flex items-center justify-between">
      <div>Naam: {name}</div>
      <div>{typeof pageNumber === 'number' ? pageNumber : ''}</div>
      <div>Geboortedatum: {dateOfBirth || '—'}</div>
    </div>
  );
}

export function SectionBand({ title }: { title: string }) {
  return (
    <div className="bg-[#f5efe6] text-[#6b2392] font-bold px-4 py-1.5 border-y border-[#c9b88a]">
      {title}
    </div>
  );
}

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
    <div className={`grid grid-cols-[260px_1fr] border-b border-[#d7c8a2] ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
      <div className="px-3 py-1.5 font-semibold text-[#333] bg-[#f9f6f0]">{label}</div>
      <div className="px-3 py-1.5 text-[#222]">{value}</div>
    </div>
  );
}
