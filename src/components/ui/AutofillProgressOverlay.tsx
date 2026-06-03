'use client';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export type AutofillProgressState = {
  currentIndex: number;
  total: number;
  currentLabel: string;
};

type Props = {
  progress: AutofillProgressState;
  title?: string;
  onCancel?: () => void;
  cancelLabel?: string;
};

export function AutofillProgressOverlay({
  progress,
  title = 'Automatisch invullen met AI',
  onCancel,
  cancelLabel = 'Stoppen',
}: Props) {
  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.currentIndex / progress.total) * 100)) : 0;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center rounded-lg bg-black/50"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="autofill-progress-title"
      aria-describedby="autofill-progress-label"
    >
      <div className="mx-4 w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-2xl">
        <div className="flex items-start gap-3">
          <LoadingSpinner size="md" className="shrink-0 pt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 id="autofill-progress-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <p id="autofill-progress-label" className="text-gray-600">
              {progress.currentLabel}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              Stap {progress.currentIndex} / {progress.total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {onCancel ? (
          <Button variant="destructive" onClick={onCancel} className="w-full">
            {cancelLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
