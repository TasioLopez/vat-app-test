'use client';

import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** For print/PDF: single page box */
  singlePage?: boolean;
};

/**
 * A4 preview: 210mm × 297mm at 96dpi ≈ 794×1123px — match TP export viewport.
 */
export default function CVA4Canvas({ children, className, singlePage = true }: Props) {
  return (
    <div
      className={cn(
        'cv-a4-box relative mx-auto bg-white text-gray-900 shadow-lg print:shadow-none',
        singlePage && 'min-h-[297mm] w-[210mm] max-w-full overflow-hidden print:min-h-0 print:h-auto print:w-full',
        className
      )}
      style={{
        width: '210mm',
        minHeight: singlePage ? '297mm' : undefined,
      }}
    >
      {children}
    </div>
  );
}
