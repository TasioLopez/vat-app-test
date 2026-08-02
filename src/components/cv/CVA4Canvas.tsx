'use client';

import CVA4PagedCanvas from '@/components/cv/CVA4PagedCanvas';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** @deprecated Ignored — preview always uses multi-page A4 frames */
  singlePage?: boolean;
};

/**
 * A4 preview: 210mm × 297mm pages; content overflows onto additional pages.
 */
export default function CVA4Canvas({ children, className }: Props) {
  return (
    <CVA4PagedCanvas className={cn(className)}>
      {children}
    </CVA4PagedCanvas>
  );
}
