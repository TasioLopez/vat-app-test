'use client';

import { useMemo } from 'react';
import { FileUp, Mic, MoreHorizontal, Pencil, RotateCcw, Square, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import type { SpeakerTurn } from '@/lib/meetings/transcript';
import { cn } from '@/lib/utils';
import { formatElapsed, sourceLabel } from '@/components/employee/gesprek/labels';
import type { TranscriptSource } from '@/lib/meetings/audio';

type Props = {
  transcript: string;
  turns: SpeakerTurn[] | null;
  transcriptSource: TranscriptSource | null;
  consent: boolean;
  recording: boolean;
  recordingSeconds: number;
  editing: boolean;
  /** Show the editor even when the transcript is still empty (paste flow). */
  forceEditor: boolean;
  forcePlain: boolean;
  canRestore: boolean;
  canParseTurns: boolean;
  busy: boolean;
  onConsentChange: (value: boolean) => void;
  onTranscriptChange: (value: string) => void;
  onTurnChange: (index: number, text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUploadFile: (file: File | null) => void;
  onStartPaste: () => void;
  onEditingChange: (value: boolean) => void;
  onForcePlainChange: (value: boolean) => void;
  onRestore: () => void;
  onRequestNewRecording: () => void;
};

const CHOICE_CLASS =
  'flex min-h-[5.5rem] flex-col items-start justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 disabled:opacity-50';

function speakerOrder(turns: SpeakerTurn[]): string[] {
  const order: string[] = [];
  for (const turn of turns) {
    if (!order.includes(turn.speaker)) order.push(turn.speaker);
  }
  return order;
}

export function TranscriptPane({
  transcript,
  turns,
  transcriptSource,
  consent,
  recording,
  recordingSeconds,
  editing,
  forceEditor,
  forcePlain,
  canRestore,
  canParseTurns,
  busy,
  onConsentChange,
  onTranscriptChange,
  onTurnChange,
  onStartRecording,
  onStopRecording,
  onUploadFile,
  onStartPaste,
  onEditingChange,
  onForcePlainChange,
  onRestore,
  onRequestNewRecording,
}: Props) {
  const empty = !transcript.trim() && !recording && !forceEditor;
  const chip = sourceLabel(transcriptSource);
  const order = useMemo(() => (turns ? speakerOrder(turns) : []), [turns]);

  const actions = !empty && !recording ? (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {chip ? (
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
          {chip}
        </span>
      ) : null}
      {editing ? (
        <Button type="button" size="sm" variant="outline" onClick={() => onEditingChange(false)}>
          Klaar
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEditingChange(true)}
          disabled={busy}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden />
          Bewerken
        </Button>
      )}
      {editing && canParseTurns ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => onForcePlainChange(!forcePlain)}>
          {forcePlain ? 'Als beurten' : 'Als tekst'}
        </Button>
      ) : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="ghost" disabled={busy} aria-label="Meer acties">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <label className="cursor-pointer">
              Vervangen door bestand
              <input
                type="file"
                accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = '';
                  onUploadFile(file);
                }}
              />
            </label>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRequestNewRecording}>Nieuwe opname</DropdownMenuItem>
          {canRestore ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onRestore}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden />
                Herstel origineel
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : chip ? (
    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
      {chip}
    </span>
  ) : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Transcript</h3>
          <p className="text-xs text-gray-600">Wat er letterlijk is gezegd. De intake leest dit niet.</p>
        </div>
        {actions}
      </div>

      {recording ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-red-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden />
            Opname {formatElapsed(recordingSeconds)}
          </span>
          <Button type="button" variant="destructive" size="sm" onClick={onStopRecording}>
            <Square className="mr-2 h-4 w-4" aria-hidden />
            Stop opname
          </Button>
        </div>
      ) : null}

      {empty ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className={cn(CHOICE_CLASS, 'cursor-default hover:border-gray-200 hover:bg-white')}>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <Mic className="h-4 w-4 text-purple-600" aria-hidden />
              Opnemen
            </span>
            <label className="mt-1 flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={consent}
                onChange={(event) => onConsentChange(event.target.checked)}
                disabled={busy}
              />
              <span>De werknemer weet dat dit gesprek wordt opgenomen.</span>
            </label>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={onStartRecording}
              disabled={busy || !consent}
            >
              Start opname
            </Button>
          </div>

          <label className={cn(CHOICE_CLASS, busy && 'pointer-events-none opacity-50')}>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <FileUp className="h-4 w-4 text-purple-600" aria-hidden />
              Bestand uploaden
            </span>
            <span className="text-xs text-gray-500">.txt, .md of .docx</span>
            <input
              type="file"
              accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = '';
                onUploadFile(file);
              }}
            />
          </label>

          <button type="button" className={CHOICE_CLASS} onClick={onStartPaste} disabled={busy}>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <Type className="h-4 w-4 text-purple-600" aria-hidden />
              Tekst plakken
            </span>
            <span className="text-xs text-gray-500">Open een leeg tekstveld</span>
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {editing ? (
            turns ? (
              <div className="space-y-3">
                {turns.map((turn, index) => {
                  const right = order.indexOf(turn.speaker) % 2 === 1;
                  return (
                    <div
                      key={`${turn.speaker}-${index}`}
                      className={cn('flex', right ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'w-full max-w-[min(100%,42rem)] rounded-lg bg-white p-3 ring-1 ring-gray-200',
                          right && 'text-right'
                        )}
                      >
                        <p className="mb-1 text-xs font-semibold text-emerald-800">{turn.speaker}</p>
                        <textarea
                          value={turn.text}
                          rows={Math.min(8, Math.max(2, turn.text.split('\n').length))}
                          disabled={recording}
                          aria-label={turn.speaker}
                          onChange={(event) => onTurnChange(index, event.target.value)}
                          className={cn(
                            'w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900',
                            right && 'text-right'
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Textarea
                id="gesprek-transcript"
                value={transcript}
                onChange={(event) => onTranscriptChange(event.target.value)}
                className="min-h-[320px] w-full bg-white"
                placeholder="Plak het transcript hier."
                disabled={recording}
                aria-label="Transcript"
              />
            )
          ) : turns ? (
            <div className="space-y-3">
              {turns.map((turn, index) => {
                const right = order.indexOf(turn.speaker) % 2 === 1;
                return (
                  <div
                    key={`${turn.speaker}-${index}`}
                    className={cn('flex', right ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[min(100%,42rem)] rounded-2xl px-3.5 py-2.5',
                        right
                          ? 'bg-emerald-50 text-right ring-1 ring-emerald-100'
                          : 'bg-white ring-1 ring-gray-200'
                      )}
                    >
                      <p className="mb-0.5 text-xs font-semibold text-emerald-800">{turn.speaker}</p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-900">{turn.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-4 ring-1 ring-gray-200">
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-900">{transcript}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
