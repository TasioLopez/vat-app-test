'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const PAGE_HEIGHT_MM = 297;
const PAGE_WIDTH_MM = 210;
const GAP_PX = 20;

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Multi-page A4 preview: fixed 210×297mm page frames; content flows and
 * overflows onto the next page. Gaps between pages are covered so the sheet
 * reads as separate A4 pages.
 */
export default function CVA4PagedCanvas({ children, className }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageHeightPx, setPageHeightPx] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  useLayoutEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;height:${PAGE_HEIGHT_MM}mm;width:0;pointer-events:none;`;
    document.body.appendChild(probe);
    setPageHeightPx(Math.max(1, probe.offsetHeight));
    document.body.removeChild(probe);
  }, []);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || pageHeightPx <= 0) return;

    const update = () => {
      const h = el.scrollHeight;
      setPageCount(Math.max(1, Math.ceil(h / pageHeightPx - 0.001)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageHeightPx, children]);

  const pageH = pageHeightPx || 1123;
  const stackHeight = pageCount * pageH + Math.max(0, pageCount - 1) * GAP_PX;

  return (
    <div
      className={cn('cv-a4-paged relative mx-auto print:h-auto print:shadow-none', className)}
      style={{ width: `${PAGE_WIDTH_MM}mm`, height: stackHeight }}
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={`page-${i}`}
          aria-hidden
          className="cv-a4-box pointer-events-none absolute left-0 w-full bg-white shadow-lg print:static print:shadow-none"
          style={{
            top: i * (pageH + GAP_PX),
            height: pageH,
            width: `${PAGE_WIDTH_MM}mm`,
          }}
        />
      ))}
      {Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (
        <div
          key={`gap-${i}`}
          aria-hidden
          className="pointer-events-none absolute z-20 bg-gray-100 print:hidden"
          style={{
            left: -12,
            right: -12,
            top: (i + 1) * pageH + i * GAP_PX,
            height: GAP_PX,
          }}
        />
      ))}
      <div
        ref={contentRef}
        className="relative z-10 w-full text-gray-900"
        style={{ minHeight: pageH, width: `${PAGE_WIDTH_MM}mm` }}
      >
        {children}
      </div>
    </div>
  );
}
