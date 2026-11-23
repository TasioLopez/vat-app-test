'use client';

import { cn } from '@/lib/utils';

type DocumentEditorShellProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  steps?: { key: string; label: string; active?: boolean; onSelect?: () => void }[];
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
};

export default function DocumentEditorShell({
  title,
  subtitle,
  steps,
  actions,
  className,
  headerClassName,
  children,
}: DocumentEditorShellProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <header
        className={cn(
          'sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white px-6 py-3',
          headerClassName
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 shrink-0">
              <div className="truncate text-xl font-bold text-gray-900">{title}</div>
              {subtitle ? <div className="mt-0.5 text-sm text-gray-600">{subtitle}</div> : null}
            </div>
            {steps && steps.length > 0 ? (
              <nav className="flex min-w-0 flex-wrap gap-1" aria-label="Stappen">
                {steps.map((step) => {
                  const interactive = typeof step.onSelect === 'function';
                  const className = cn(
                    'rounded-full px-2.5 py-1 text-xs transition',
                    step.active
                      ? 'bg-[var(--color-primary-50)] font-medium text-[var(--color-primary-700)]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  );
                  if (!interactive) {
                    return (
                      <span key={step.key} className={className} aria-current={step.active ? 'step' : undefined}>
                        {step.label}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={step.onSelect}
                      className={className}
                      aria-current={step.active ? 'step' : undefined}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </nav>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
        </div>
      </header>
      {children}
    </div>
  );
}
