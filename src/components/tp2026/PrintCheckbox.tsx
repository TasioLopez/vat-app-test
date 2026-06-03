'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function PrintCheckbox({
  checked,
  className,
  size = 11,
}: {
  checked: boolean;
  className?: string;
  size?: number;
}) {
  const iconSize = Math.round(size * 0.72);
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-neutral-900 align-middle',
        className
      )}
      style={{ width: size, height: size }}
    >
      {checked ? (
        <svg
          viewBox="0 0 10 10"
          aria-hidden
          style={{ width: iconSize, height: iconSize }}
        >
          <path
            d="M1.5 5.2 L4 7.7 L8.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      ) : null}
    </span>
  );
}

function PrintLabeledCheck({
  checked,
  label,
  className,
}: {
  checked: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <PrintCheckbox checked={checked} />
      {label}
    </span>
  );
}

export function PrintJaNeeChecks({
  value,
  className,
}: {
  value: boolean | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-5 text-neutral-900', className)}>
      <PrintLabeledCheck checked={value === true} label="ja" />
      <PrintLabeledCheck checked={value === false} label="nee" />
    </span>
  );
}

export function PrintGenderChecks({
  gender,
  className,
}: {
  gender?: string | null;
  className?: string;
}) {
  const g = (gender || '').toString().toLowerCase();
  const man = g === 'man' || g === 'male';
  const vrouw = g === 'vrouw' || g === 'female';
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-5 text-neutral-900', className)}>
      <PrintLabeledCheck checked={man} label="man" />
      <PrintLabeledCheck checked={vrouw} label="vrouw" />
    </span>
  );
}
