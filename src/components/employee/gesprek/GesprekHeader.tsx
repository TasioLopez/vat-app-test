'use client';

import { Check, ChevronDown, Columns2, Mic, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MeetingCapture } from '@/lib/meetings/audio';
import { cn } from '@/lib/utils';
import { formatCaptureDate, sourceLabel, STATUS_LABEL } from '@/components/employee/gesprek/labels';

export type GesprekPane = 'transcript' | 'verslag';

type Props = {
  captures: MeetingCapture[];
  activeId: string | null;
  activeCapture: MeetingCapture | null;
  pane: GesprekPane;
  sideBySide: boolean;
  hasTranscript: boolean;
  hasVerslag: boolean;
  isAccepted: boolean;
  busy: boolean;
  recording: boolean;
  onSelectCapture: (capture: MeetingCapture) => void;
  onNew: () => void;
  onDelete: () => void;
  onPaneChange: (pane: GesprekPane) => void;
  onSideBySideChange: (value: boolean) => void;
};

function Step({
  index,
  label,
  done,
}: {
  index: number;
  label: string;
  done: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        done ? 'text-emerald-800' : 'text-gray-400'
      )}
      title={label}
    >
      <span
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
          done ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
        )}
      >
        {done ? <Check className="h-3 w-3" aria-hidden /> : index}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

export function GesprekHeader({
  captures,
  activeId,
  activeCapture,
  pane,
  sideBySide,
  hasTranscript,
  hasVerslag,
  isAccepted,
  busy,
  recording,
  onSelectCapture,
  onNew,
  onDelete,
  onPaneChange,
  onSideBySideChange,
}: Props) {
  const triggerLabel = activeCapture
    ? formatCaptureDate(activeCapture.created_at)
    : 'Nieuw gesprek';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <h2 className="text-base font-semibold text-gray-900">Gesprek</h2>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={busy || recording}
                className="inline-flex h-8 max-w-[14rem] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 disabled:opacity-50"
              >
                <span className="truncate">{triggerLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Gesprekken</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={onNew}
                className={!activeId ? 'bg-emerald-50 text-emerald-800' : undefined}
              >
                Nieuw gesprek
              </DropdownMenuItem>
              {captures.length > 0 ? <DropdownMenuSeparator /> : null}
              {captures.map((capture) => {
                const source = sourceLabel(capture.transcript_source);
                return (
                  <DropdownMenuItem
                    key={capture.id}
                    onSelect={() => onSelectCapture(capture)}
                    className={cn(
                      'flex flex-col items-start gap-0.5',
                      capture.id === activeId && 'bg-emerald-50 text-emerald-800'
                    )}
                  >
                    <span className="font-medium">{formatCaptureDate(capture.created_at)}</span>
                    <span className="text-[11px] text-gray-500">
                      {STATUS_LABEL[capture.status]}
                      {source ? ` · ${source}` : ''}
                    </span>
                  </DropdownMenuItem>
                );
              })}
              {activeId ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={onDelete}
                    className="text-red-700 focus:bg-red-50 focus:text-red-800"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                    Dit gesprek verwijderen
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Step index={1} label="Transcript" done={hasTranscript} />
          <span className="text-gray-300" aria-hidden>
            –
          </span>
          <Step index={2} label="Verslag" done={hasVerslag} />
          <span className="text-gray-300" aria-hidden>
            –
          </span>
          <Step index={3} label="Bron intake" done={isAccepted} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Gesprek pane"
          className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
        >
          {(['transcript', 'verslag'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={pane === value}
              onClick={() => onPaneChange(value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                pane === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {value === 'transcript' ? 'Transcript' : 'Verslag'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSideBySideChange(!sideBySide)}
          className={cn(
            'hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium lg:inline-flex',
            sideBySide
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          )}
          title="Toon transcript en verslag naast elkaar"
        >
          <Columns2 className="h-3.5 w-3.5" aria-hidden />
          Naast elkaar
        </button>
      </div>
    </div>
  );
}
