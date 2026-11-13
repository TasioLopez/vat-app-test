'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  statusLine: string;
  statusTone: 'neutral' | 'success' | 'warning';
  dirty: boolean;
  isAccepted: boolean;
  canPublish: boolean;
  busy: boolean;
  recording: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onForceReplace?: () => void;
  needsReplace?: boolean;
};

export function GesprekFooter({
  statusLine,
  statusTone,
  dirty,
  isAccepted,
  canPublish,
  busy,
  recording,
  onSaveDraft,
  onPublish,
  onForceReplace,
  needsReplace = false,
}: Props) {
  const showAccepted = isAccepted && !dirty && !needsReplace;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
      <p
        className={cn(
          'min-w-0 text-sm',
          statusTone === 'success' && 'text-emerald-700',
          statusTone === 'warning' && 'text-amber-800',
          statusTone === 'neutral' && 'text-gray-600'
        )}
        role="status"
      >
        {statusLine}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {dirty ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={busy || recording}
          >
            Bewaar concept
          </Button>
        ) : null}

        {needsReplace && onForceReplace ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onForceReplace}
            disabled={busy || recording}
          >
            Vervang de bestaande bron
          </Button>
        ) : showAccepted ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
            Dit is de bron voor de intake
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onPublish}
            disabled={busy || recording || !canPublish}
          >
            Gebruik als bron voor intake
          </Button>
        )}
      </div>
    </div>
  );
}
