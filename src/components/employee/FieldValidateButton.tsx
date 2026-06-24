'use client';

import type React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled: boolean;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
};

export function FieldValidateButton({
  onClick,
  disabled,
  label,
  size = 'md',
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-green-200 bg-white text-green-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        className
      )}
      aria-label={label}
      title={label}
    >
      <CheckCircle2
        className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
        aria-hidden
      />
    </button>
  );
}
