import React from 'react';
import Image from 'next/image';
import Logo2 from '@/assets/images/logo-2.png';
import { TP_BASIS_TOELICHTING_CLASS } from '@/lib/tp2026/basis-document-layout';
import { TP2026_BODY_FLOW_START_SPACER_PX, TP2026_LOGO, TP2026_LOGO_BULLET_PX } from '@/lib/tp2026/document-layout';
import {
  TP2026_DATA_ROW_CLASS,
  TP2026_DATA_ROW_LABEL_CLASS,
  TP2026_DATA_ROW_VALUE_CLASS,
  TP2026_FIELD_TABLE_CLASS,
} from '@/lib/tp2026/tp2026-colors';
import { formatTP2026CoverVoorName } from '@/lib/utils';

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
      className={`bg-white w-[794px] h-[1123px] max-h-[1123px] min-h-[1123px] shrink-0 border border-zinc-300 shadow-sm print:shadow-none print:border-0 overflow-hidden ${className}`}
      style={{
        fontFamily: 'var(--font-montserrat), Montserrat, system-ui, sans-serif',
        height: A4_H,
        maxHeight: A4_H,
        minHeight: A4_H,
        width: A4_W,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function A4LogoHeader({
  compact = false,
  flowStartSpacerPx,
}: {
  compact?: boolean;
  flowStartSpacerPx?: number;
}) {
  if (compact) {
    return (
      <div className="mb-2 flex w-full justify-start">
        <Image src={Logo2} alt="ValentineZ" width={120} height={40} loading="eager" />
      </div>
    );
  }

  const spacerPx = flowStartSpacerPx ?? TP2026_BODY_FLOW_START_SPACER_PX;
  const { leftPx, topPx, widthPx, heightPx } = TP2026_LOGO;
  return (
    <>
      <div
        className="pointer-events-none absolute z-10 flex flex-col items-start"
        style={{ left: leftPx, top: topPx }}
      >
        <Image src={Logo2} alt="ValentineZ" width={widthPx} height={heightPx} loading="eager" />
      </div>
      <div className="shrink-0" style={{ height: spacerPx }} aria-hidden />
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
  const name = formatTP2026CoverVoorName(firstName, lastName);
  return (
    <div className="mt-auto shrink-0 py-2.5">
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

/** Salmon full-width band (Onderdelen Spoor 2 begeleiding, inhoudsopgave). */
export function SalmonSectionBar({
  title,
  className = '',
  barColorClass = 'bg-[#c76f5c]',
}: {
  title: string;
  className?: string;
  barColorClass?: string;
}) {
  return (
    <div
      className={`-mx-4 px-4 py-2.5 text-[15px] font-bold leading-tight text-white ${barColorClass} ${className}`}
    >
      {title}
    </div>
  );
}

/** Teal subsection title (legacy helper; Spoor 2 uses Spoor2SectionUnits). */
export function TealSubsectionTitle({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div className={`mb-1 text-[12px] font-bold leading-tight text-[#64b6a6] ${className}`}>{title}</div>
  );
}

/** Teal in-box sub-heading (Toelichting) for Profiel sections. */
export function BasisToelichtingHeading({ label }: { label: string }) {
  return <div className={TP_BASIS_TOELICHTING_CLASS}>{label}</div>;
}

/** Purple full-width band (Profiel werknemer, matches inhoudsopgave). */
export function PurpleSectionBar({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div
      className={`-mx-4 pl-6 pr-4 py-2.5 text-[15px] font-bold leading-tight text-white bg-[#5a257d] ${className}`}
    >
      {title}
    </div>
  );
}

/** Section title: plain bold purple on white (Word template style, no tan band). */
export function SectionBand({
  title,
  className = '',
  underline = false,
}: {
  title: string;
  className?: string;
  /** Basisdocument (step 3): match Word underlined section titles. */
  underline?: boolean;
}) {
  return (
    <div
      className={`mb-1 text-[12px] font-extrabold leading-tight text-[#6d2a96] ${underline ? 'underline underline-offset-2 decoration-[#6d2a96]/70' : ''} ${className}`}
    >
      {title}
    </div>
  );
}

/** ValentineZ Z-logo list bullet (shared size for print/PDF). */
export function ValentineZLogoBullet({
  size = TP2026_LOGO_BULLET_PX,
  className = 'mt-0.5 shrink-0',
  eagerLoading = false,
}: {
  size?: number;
  className?: string;
  eagerLoading?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/val-logo.jpg"
      alt=""
      width={size}
      height={size}
      className={className}
      loading={eagerLoading ? 'eager' : undefined}
    />
  );
}

/** Bordered field table: full outer frame + horizontal rules between rows (template-style grid). */
export function TP2026FieldTable({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`${TP2026_FIELD_TABLE_CLASS} ${className}`}>{children}</div>;
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
  const size = compact ? 'text-[10px]' : 'text-[12px]';
  return (
    <div className={`${TP2026_DATA_ROW_CLASS} grid grid-cols-[35%_65%] ${size} leading-snug`}>
      <div className={TP2026_DATA_ROW_LABEL_CLASS}>
        {label}
      </div>
      <div className={TP2026_DATA_ROW_VALUE_CLASS}>{value}</div>
    </div>
  );
}
