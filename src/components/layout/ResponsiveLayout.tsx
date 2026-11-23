'use client';

import React, { useState, useEffect, ReactNode, cloneElement, isValidElement } from 'react';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
  collapsed?: boolean;
}

export function ResponsiveLayout({ children, sidebar, className, collapsed = false }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const desktopSidebar =
    isValidElement(sidebar)
      ? cloneElement(sidebar as React.ReactElement<{ variant?: string }>, { variant: 'desktop' })
      : sidebar;

  const mobileSidebar =
    isValidElement(sidebar)
      ? cloneElement(sidebar as React.ReactElement<{ variant?: string; onNavigate?: () => void; collapsed?: boolean }>, {
          variant: 'mobile',
          collapsed: false,
          onNavigate: () => setSidebarOpen(false),
        })
      : sidebar;

  return (
    <div className="flex min-h-screen bg-background">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {isMobile && (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out',
            !sidebarOpen && '-translate-x-full',
            sidebarOpen && 'translate-x-0'
          )}
        >
          {mobileSidebar}
        </aside>
      )}

      {!isMobile && desktopSidebar}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden h-screen',
          !isMobile && (collapsed ? 'ml-16' : 'ml-64')
        )}
      >
        {isMobile && (
          <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Menu openen"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image
              src="/branding/vat-app-logo.svg"
              alt="ValentineZ Assist Tool"
              width={72}
              height={28}
              className="h-7 w-auto object-contain"
            />
            <div className="w-9" />
          </header>
        )}

        <main className={cn('flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Responsive grid component
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  className 
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div
      className={cn(
        'grid',
        colClasses[cols.default],
        cols.sm && `sm:${colClasses[cols.sm]}`,
        cols.md && `md:${colClasses[cols.md]}`,
        cols.lg && `lg:${colClasses[cols.lg]}`,
        cols.xl && `xl:${colClasses[cols.xl]}`,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// Responsive container
interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveContainer({ 
  children, 
  maxWidth = 'xl',
  padding = 'md',
  className 
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2',
    md: 'px-6 py-4',
    lg: 'px-8 py-6',
  };

  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

// Responsive text
interface ResponsiveTextProps {
  children: ReactNode;
  size?: {
    default: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    sm?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    md?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    lg?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  };
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
}

export function ResponsiveText({ 
  children, 
  size = { default: 'base' },
  weight = 'normal',
  className 
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <span
      className={cn(
        sizeClasses[size.default],
        size.sm && `sm:${sizeClasses[size.sm]}`,
        size.md && `md:${sizeClasses[size.md]}`,
        size.lg && `lg:${sizeClasses[size.lg]}`,
        weightClasses[weight],
        className
      )}
    >
      {children}
    </span>
  );
}
