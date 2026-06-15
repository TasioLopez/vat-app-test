'use client';

import { CheckCircle2 } from 'lucide-react';

type Props = {
  validated: number;
  total: number;
};

export function BasisValidationProgress({ validated, total }: Props) {
  const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
  const complete = validated >= total && total > 0;
  const ringColor = complete ? '#22c55e' : '#f59e0b';
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2"
      title={`${validated} van ${total} gevalideerd`}
      aria-label={`${validated} van ${total} gevalideerd`}
    >
      <div className="relative h-9 w-9 shrink-0">
        <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted-foreground/20"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        {complete ? (
          <CheckCircle2
            className="absolute inset-0 m-auto h-4 w-4 text-green-600"
            aria-hidden
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-foreground">
            {validated}
          </span>
        )}
      </div>
      <span className="text-sm font-medium tabular-nums text-foreground">
        {validated}/{total}
      </span>
    </div>
  );
}
