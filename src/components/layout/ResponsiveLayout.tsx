'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - only for mobile overlay */}
      {isMobile && (
        <aside
          className={cn(
            'bg-sidebar border-r border-sidebar-border shadow-lg transition-transform duration-300 ease-in-out',
            'flex flex-col fixed inset-y-0 left-0 z-50 w-64 transform',
            !sidebarOpen && '-translate-x-full',
            sidebarOpen && 'translate-x-0'
          )}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Menu
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebar}
          </div>
        </aside>
      )}

      {/* Desktop sidebar - rendered directly, not wrapped */}
      {!isMobile && sidebar}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <header className="bg-card border-b border-border shadow-sm px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-semibold text-foreground">
                VAT App
              </h1>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        {/* Content */}
        <main className={cn('flex-1 p-4 md:p-6', className)}>
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
