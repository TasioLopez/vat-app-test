'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FieldValidateButton } from '@/components/employee/FieldValidateButton';

type Props = {
  children: React.ReactNode;
  onValidate: (e: React.MouseEvent<HTMLButtonElement>) => void;
  canValidate: boolean;
  validateLabel: string;
  /** inside: right-centre of control; textarea-top: top-right (multi-line fields). */
  placement?: 'inside' | 'textarea-top';
  buttonSize?: 'sm' | 'md';
  className?: string;
};

export function ValidatableField({
  children,
  onValidate,
  canValidate,
  validateLabel,
  placement = 'inside',
  buttonSize = 'md',
  className,
}: Props) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <FieldValidateButton
        onClick={onValidate}
        disabled={!canValidate}
        label={validateLabel}
        size={buttonSize}
        className={
          placement === 'textarea-top'
            ? 'absolute right-2 top-2 z-10'
            : 'absolute right-2 top-1/2 z-10 -translate-y-1/2'
        }
      />
    </div>
  );
}
