import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
            sizeClasses[size]
          )}
        />
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
        )}
      </div>
    </div>
  );
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  text = 'Laden...' 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  );
}

export function LoadingButton({
  isLoading,
  children,
  loadingText = 'Laden...',
  disabled,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading: boolean;
  loadingText?: string;
}) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-4 py-2 rounded-md font-medium transition-colors',
        'bg-blue-600 text-white hover:bg-blue-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading ? loadingText : children}
    </button>
  );
}
