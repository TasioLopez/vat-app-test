'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TPPreviewWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * TPPreviewWrapper - Standardized wrapper for TP preview sections
 * 
 * This component maintains the critical structure for TP previews:
 * - 50/50 split layout between form and preview
 * - scale-[0.65] transform for A4 preview scaling
 * - Consistent styling container
 * 
 * DO NOT modify the container dimensions or scaling without careful testing.
 */
export default function TPPreviewWrapper({ children, className }: TPPreviewWrapperProps) {
  return (
    <div className={cn(
      "w-[50%] flex justify-center items-start pt-4 overflow-y-auto overflow-x-hidden max-h-[75vh]",
      className
    )}>
      <div className="transform scale-[0.65] origin-top">
        {children}
      </div>
    </div>
  );
}

