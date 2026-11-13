'use client';

import dynamic from 'next/dynamic';
import { AlertTriangle, FileUp, MoreHorizontal, Sparkles, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NotesOrigin } from '@/lib/meetings/audio';
import { cn } from '@/lib/utils';
import { originLabel } from '@/components/employee/gesprek/labels';

const VerslagEditor = dynamic(
  () =>
    import('@/components/tp2026/Basis2026MarkdownFieldEditor').then(
      (mod) => mod.Basis2026MarkdownFieldEditor
    ),
  {
    ssr: false,
    loading: () => <div className="min-h-[280px] rounded-md border border-gray-200 bg-white" />,
  }
);

type Props = {
  notes: string;
  notesOrigin: NotesOrigin | null;
  hasTranscript: boolean;
  looksLikeTranscript: boolean;
  activeId: string | null;
  busy: boolean;
  recording: boolean;
  needsGenerateReplace: boolean;
  writing: boolean;
  onNotesChange: (value: string) => void;
  onGenerate: (replace?: boolean) => void;
  onUploadFile: (file: File | null) => void;
  onStartWriting: () => void;
};

const CHOICE_CLASS =
  'flex min-h-[5.5rem] flex-col items-start justify-center gap-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-50';

export function VerslagPane({
  notes,
  notesOrigin,
  hasTranscript,
  looksLikeTranscript,
  activeId,
  busy,
  recording,
  needsGenerateReplace,
  writing,
  onNotesChange,
  onGenerate,
  onUploadFile,
  onStartWriting,
}: Props) {
  const empty = !notes.trim() && !writing;
  const chip = originLabel(notesOrigin);

  const moreMenu = !empty ? (
    <div className="flex shrink-0 items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="ghost" disabled={busy || recording} aria-label="Meer acties">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {chip ? (
            <DropdownMenuItem disabled className="text-xs text-gray-500">
              Herkomst: {chip}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <label className="cursor-pointer">
              Vervangen door bestand
              <input
                type="file"
                accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                disabled={busy || recording}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = '';
                  onUploadFile(file);
                }}
              />
            </label>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null;

  const toolbarEnd = (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => onGenerate(false)}
        disabled={busy || recording || !hasTranscript}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Opnieuw maken uit transcript
      </Button>
      {needsGenerateReplace ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onGenerate(true)}
          disabled={busy}
        >
          Vervang en maak verslag
        </Button>
      ) : null}
    </div>
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3
          className="text-sm font-semibold text-gray-900"
          title="Samenvatting van het gesprek. Dit leest de intake."
        >
          Verslag
        </h3>
        {moreMenu}
      </div>

      {looksLikeTranscript && notes.trim() ? (
        <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          <span className="truncate">Dit lijkt een transcript — maak eerst een verslag</span>
          <button
            type="button"
            className="shrink-0 font-medium text-amber-900 underline-offset-2 hover:underline disabled:opacity-50"
            onClick={() => onGenerate(false)}
            disabled={busy || recording || !hasTranscript}
          >
            Maken
          </button>
        </div>
      ) : null}

      {empty ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            className={CHOICE_CLASS}
            onClick={() => onGenerate(false)}
            disabled={busy || recording || !hasTranscript}
            title={hasTranscript ? undefined : 'Er is nog geen transcript'}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden />
              Maak verslag uit transcript
            </span>
            <span className="text-xs text-gray-500">
              {hasTranscript ? 'AI schrijft de samenvatting' : 'Eerst een transcript nodig'}
            </span>
          </button>

          <label className={cn(CHOICE_CLASS, (busy || recording) && 'pointer-events-none opacity-50')}>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <FileUp className="h-4 w-4 text-emerald-700" aria-hidden />
              Bestand uploaden
            </span>
            <span className="text-xs text-gray-500">Bestaand verslag (.txt, .md, .docx)</span>
            <input
              type="file"
              accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={busy || recording}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = '';
                onUploadFile(file);
              }}
            />
          </label>

          <button type="button" className={CHOICE_CLASS} onClick={onStartWriting} disabled={busy || recording}>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
              <Type className="h-4 w-4 text-emerald-700" aria-hidden />
              Zelf schrijven
            </span>
            <span className="text-xs text-gray-500">Open de teksteditor</span>
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VerslagEditor
            key={activeId ?? 'new'}
            markdown={notes}
            onChange={onNotesChange}
            appearance="neutral"
            delay={0}
            stickyToolbar
            toolbarEnd={toolbarEnd}
            minHeightClassName="min-h-[320px]"
            placeholder="Schrijf het verslag, of maak het uit het transcript."
          />
        </div>
      )}
    </section>
  );
}
