import React from 'react';
import { TP2026_LOGO_BULLET_PX } from '@/lib/tp2026/document-layout';

/** ValentineZ Z-logo list bullet (shared size for print/PDF). */
export function ValentineZLogoBullet({
  size = TP2026_LOGO_BULLET_PX,
  className = 'shrink-0',
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

/** Flex row with Z-logo bullet aligned to the first text line. */
export function ValentineZLogoBulletRow({
  children,
  className = '',
  eagerLoading = false,
}: {
  children: React.ReactNode;
  className?: string;
  eagerLoading?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <span className="flex h-[1lh] shrink-0 items-center" aria-hidden>
        <ValentineZLogoBullet eagerLoading={eagerLoading} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
