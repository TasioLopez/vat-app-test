'use client';

import React, { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const PREVIEW_SCALE = 0.65;

interface TPPreviewWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * TPPreviewWrapper - Standardized wrapper for TP preview sections
 *
 * - 50% width preview pane with vertical scroll
 * - scale(0.65) for A4 preview sizing
 * - ResizeObserver sets outer height to measured × scale so scroll range matches visible content
 *   (transform alone leaves ~35% phantom scroll per page)
 */
export default function TPPreviewWrapper({ children, className }: TPPreviewWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const update = () => {
      setScaledHeight(node.offsetHeight * PREVIEW_SCALE);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-[50%] items-start justify-center overflow-y-auto overflow-x-hidden',
        className
      )}
    >
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ height: scaledHeight ?? undefined }}
      >
        <div
          ref={contentRef}
          className="origin-top"
          style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top center' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
