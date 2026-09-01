'use client';

import React, { useState } from 'react';
import {
  createEmptyDraft,
  markDraftFinalized,
  parseDraft,
  type ZoekprofielClarificationDraft,
} from '@/lib/tp/zoekprofiel/draft';
import { Basis2026MarkdownFieldEditor } from '@/components/tp2026/Basis2026MarkdownFieldEditor';
import { useDebouncedSync } from '@/hooks/useDebouncedSync';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TEXTAREA_CLASS =
  'w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ZoekprofielEditor({
  raw,
  draft: draftProp,
  employeeId,
  onChange,
  onDraftChange,
}: {
  raw: string;
  draft?: unknown;
  employeeId?: string;
  onChange: (next: string) => void;
  onDraftChange?: (next: ZoekprofielClarificationDraft) => void;
}) {
  const { value: draftMd, setDraft: setDraftMd } = useDebouncedSync({
    external: String(raw ?? ''),
    onSync: onChange,
  });

  const draft = parseDraft(draftProp ?? createEmptyDraft());
  const setDraftState = (next: ZoekprofielClarificationDraft) => {
    onDraftChange?.(next);
  };

  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState<'initial' | 'answer' | 'finalize' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function postZoekprofiel(body: Record<string, unknown>) {
    if (!employeeId) {
      throw new Error('Geen werknemer-id beschikbaar');
    }
    const res = await fetch(
      `/api/autofill-tp-3/zoekprofiel?employeeId=${encodeURIComponent(employeeId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(typeof json.error === 'string' ? json.error : `HTTP ${res.status}`);
    }
    if (typeof json.error === 'string' && json.error.trim()) {
      throw new Error(json.error);
    }
    return json;
  }

  const handleGenerate = async (mode: 'initial' | 'answer') => {
    setError(null);
    setWarnings([]);
    setBusy(mode);
    try {
      const json = await postZoekprofiel({
        mode,
        userAnswer: mode === 'answer' ? answer : undefined,
        draft,
      });

      if (json.draft) {
        setDraftState(parseDraft(json.draft));
      }

      if (json.requires_clarification) {
        setAnswer('');
        return;
      }

      const preview = String(json.zoekprofiel ?? '').trim();
      if (preview) {
        setDraftMd(preview);
      }

      const qw = Array.isArray(json.warnings) ? json.warnings.map(String) : [];
      setWarnings(qw);
      if (mode === 'answer') setAnswer('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generatie mislukt');
    } finally {
      setBusy(null);
    }
  };

  const handleFinalize = async () => {
    setError(null);
    setBusy('finalize');
    try {
      const zoekprofiel = String(draft.pendingZoekprofiel ?? draftMd).trim();
      if (!zoekprofiel) {
        throw new Error('Geen zoekprofiel om toe te passen');
      }
      const json = await postZoekprofiel({
        mode: 'finalize',
        zoekprofiel,
        draft,
      });
      const details =
        json.details && typeof json.details === 'object'
          ? (json.details as Record<string, unknown>)
          : {};
      const md = String(details.zoekprofiel ?? zoekprofiel).trim();
      if (md) setDraftMd(md);
      if (details.zoekprofiel_clarification_draft) {
        setDraftState(parseDraft(details.zoekprofiel_clarification_draft));
      } else {
        setDraftState(markDraftFinalized(draft));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toepassen mislukt');
    } finally {
      setBusy(null);
    }
  };

  const awaitingAnswer = draft.status === 'awaiting_answer' && draft.pendingQuestion;
  const hasPreview = Boolean(draft.pendingZoekprofiel?.trim());

  return (
    <div className="space-y-3">
      <Basis2026MarkdownFieldEditor
        markdown={draftMd}
        onChange={setDraftMd}
        placeholder="Zoekprofiel (twee alinea's)…"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!employeeId || busy !== null}
          onClick={() => void handleGenerate('initial')}
        >
          {busy === 'initial' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Genereer zoekprofiel
        </Button>
        {hasPreview ? (
          <Button
            type="button"
            size="sm"
            disabled={busy !== null}
            onClick={() => void handleFinalize()}
          >
            {busy === 'finalize' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Toepassen op trajectplan
          </Button>
        ) : null}
      </div>

      {awaitingAnswer ? (
        <div className="rounded-md border border-amber-300/60 bg-amber-50/80 p-3 dark:border-amber-700/40 dark:bg-amber-950/20">
          <p className="mb-2 text-sm font-medium text-foreground">Verduidelijking nodig</p>
          <p className="mb-3 text-sm text-muted-foreground">{draft.pendingQuestion}</p>
          <textarea
            className={TEXTAREA_CLASS}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Uw antwoord…"
          />
          <Button
            type="button"
            className="mt-2"
            size="sm"
            disabled={!answer.trim() || busy !== null}
            onClick={() => void handleGenerate('answer')}
          >
            {busy === 'answer' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Antwoord &amp; opnieuw genereren
          </Button>
        </div>
      ) : null}

      {hasPreview && draft.pendingZoekprofiel !== draftMd ? (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorvertoning gegenereerd zoekprofiel</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{draft.pendingZoekprofiel}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {warnings.map((w) => (
        <p key={w} className="text-sm text-amber-700 dark:text-amber-400">
          {w}
        </p>
      ))}
    </div>
  );
}
