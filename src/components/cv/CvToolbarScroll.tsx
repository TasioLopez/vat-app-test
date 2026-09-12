'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  role?: HTMLAttributes<HTMLDivElement>['role'];
  'aria-label'?: string;
};

const SCROLL_EDGE_PX = 2;

export default function CvToolbarScroll({
  children,
  className,
  role,
  'aria-label': ariaLabel,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > SCROLL_EDGE_PX);
    setCanScrollRight(maxScroll > SCROLL_EDGE_PX && scrollLeft < maxScroll - SCROLL_EDGE_PX);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    const content = contentRef.current;
    if (!el) return;

    updateScrollState();

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
      updateScrollState();
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(el);
    if (content) resizeObserver.observe(content);

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(120, Math.round(el.clientWidth * 0.75));
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        ref={scrollerRef}
        role={role}
        aria-label={ariaLabel}
        className="-mx-1 min-h-0 overflow-x-auto overflow-y-hidden px-1 pt-1.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={contentRef} className="flex flex-nowrap items-center gap-2">
          {children}
        </div>
      </div>

      {canScrollLeft ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white via-white/90 to-transparent"
            aria-hidden
          />
          <button
            type="button"
            className="absolute top-1/2 left-0.5 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200/80 bg-white/70 text-gray-600 shadow-sm backdrop-blur-[2px] transition hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            aria-label="Meer naar links"
            title="Meer naar links"
            onClick={() => scrollByPage(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : null}

      {canScrollRight ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/90 to-transparent"
            aria-hidden
          />
          <button
            type="button"
            className="absolute top-1/2 right-0.5 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200/80 bg-white/70 text-gray-600 shadow-sm backdrop-blur-[2px] transition hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            aria-label="Meer naar rechts"
            title="Meer naar rechts"
            onClick={() => scrollByPage(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
