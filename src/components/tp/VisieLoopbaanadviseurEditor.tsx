'use client';

import React, { useState } from 'react';
import {
  buildVisieLoopbaanadviseurBlock,
  parseVisieLoopbaanadviseur,
} from '@/lib/tp/visie-loopbaanadviseur/build-fields';
import {
  FUNCTIE_FINAL_MIN_COUNT,
  FUNCTIE_FOOTER,
} from '@/lib/tp/visie-loopbaanadviseur/constants';
import {
  createEmptyDraft,
  getKeptFuncties,
  getRejectedNames,
  parseDraft,
  toggleSuggestionStatus,
  updateSuggestionFields,
  type VisieLaFunctieDraft,
} from '@/lib/tp/visie-loopbaanadviseur/draft';
import { parseFunctieLine } from '@/lib/tp/visie-loopbaanadviseur/parse-functie-line';
import { VisieLoopbaanadviseurBlock } from '@/components/tp/VisieLoopbaanadviseurBlock';
import { useDebouncedSync } from '@/hooks/useDebouncedSync';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TEXTAREA_CLASS =
  'w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function VisieLoopbaanadviseurEditor({
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
  onDraftChange?: (next: VisieLaFunctieDraft) => void;
}) {
  const { value: draftMd, setDraft: setDraftMd } = useDebouncedSync({
    external: String(raw ?? ''),
    onSync: onChange,
  });
  const parsed = parseVisieLoopbaanadviseur(draftMd);

  const draft = parseDraft(draftProp);
  const setDraftState = (next: VisieLaFunctieDraft) => {
    onDraftChange?.(next);
  };

  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<'suggest' | 'regenerate' | 'finalize' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showManual, setShowManual] = useState(false);

  const update = (patch: Partial<typeof parsed>) => {
    setDraftMd(buildVisieLoopbaanadviseurBlock({ ...parsed, ...patch }));
  };

  const previewRaw = buildVisieLoopbaanadviseurBlock(parsed);
  const kept = draft.suggestions.filter((s) => s.status === 'kept');
  const pending = draft.suggestions.filter((s) => s.status === 'pending');
  const hasDraft = draft.suggestions.length > 0;

  async function postVisie(body: Record<string, unknown>) {
    if (!employeeId) {
      throw new Error('Geen werknemer-id beschikbaar');
    }
    const res = await fetch(
      `/api/autofill-tp-3/visie-adviseur?employeeId=${encodeURIComponent(employeeId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        typeof json.error === 'string' ? json.error : `HTTP ${res.status}`
      );
    }
    if (typeof json.error === 'string' && json.error.trim()) {
      throw new Error(json.error);
    }
    return json;
  }

  const handleGenerate = async (mode: 'initial' | 'regenerate') => {
    setError(null);
    setWarnings([]);
    setBusy(mode === 'initial' ? 'suggest' : 'regenerate');
    try {
      const keptFuncties = getKeptFuncties(draft);
      const rejected = getRejectedNames(draft);
      // Unchecked pending become rejected on regenerate (server also merges)
      if (mode === 'regenerate') {
        for (const s of pending) {
          rejected.push(s.naam);
        }
      }
      const json = await postVisie({
        mode,
        kept: keptFuncties,
        rejected: mode === 'regenerate' ? rejected : [],
        userFeedback: mode === 'regenerate' ? feedback : undefined,
        draft,
      });
      if (json.draft) {
        setDraftState(parseDraft(json.draft));
      }
      const qw = Array.isArray(json.qualityWarnings)
        ? json.qualityWarnings.map(String)
        : [];
      setWarnings(qw);
      if (mode === 'regenerate') setFeedback('');
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
      const keptFuncties = getKeptFuncties(draft);
      if (keptFuncties.length < FUNCTIE_FINAL_MIN_COUNT) {
        throw new Error(
          `Selecteer minstens ${FUNCTIE_FINAL_MIN_COUNT} functie om toe te passen`
        );
      }
      const json = await postVisie({
        mode: 'finalize',
        kept: keptFuncties,
        draft,
      });
      const details =
        json.details && typeof json.details === 'object'
          ? (json.details as Record<string, unknown>)
          : {};
      const md = String(details.visie_loopbaanadviseur ?? '').trim();
      if (md) {
        setDraftMd(md);
        onChange(md);
      }
      if (details.visie_la_functie_draft) {
        setDraftState(parseDraft(details.visie_la_functie_draft));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toepassen mislukt');
    } finally {
      setBusy(null);
    }
  };

  const syncManualBulletsToDraft = (bullets: string) => {
    update({ functieBullets: bullets });
    const lines = bullets
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const keptFromManual = lines
      .map((line) => parseFunctieLine(line))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({ naam: p.title, toelichting: p.description }));
    if (keptFromManual.length === 0) return;
    const base = hasDraft ? draft : createEmptyDraft();
    const pendingKeep = base.suggestions.filter((s) => s.status === 'pending');
    const rejectedKeep = base.suggestions.filter((s) => s.status === 'rejected');
    const next: VisieLaFunctieDraft = {
      ...base,
      suggestions: [
        ...keptFromManual.map((f, i) => ({
          id: `manual-${i}-${f.naam}`,
          naam: f.naam,
          toelichting: f.toelichting,
          status: 'kept' as const,
          batchId: 'manual',
        })),
        ...pendingKeep,
        ...rejectedKeep,
      ],
      finalizedAt: null,
    };
    setDraftState(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">Toelichting</label>
        <textarea
          className={TEXTAREA_CLASS}
          value={parsed.toelichting}
          onChange={(e) => update({ toelichting: e.target.value })}
          rows={5}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#64b6a6]">
          Mogelijk passende functies — intro
        </label>
        <textarea
          className={TEXTAREA_CLASS}
          value={parsed.functiesIntro}
          onChange={(e) => update({ functiesIntro: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-3 rounded-md border border-[#b8985c]/30 bg-[#faf8f4] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-[#64b6a6]">Functiesuggesties</p>
          <div className="flex flex-wrap gap-2">
            {!hasDraft ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!employeeId || busy != null}
                onClick={() => void handleGenerate('initial')}
              >
                {busy === 'suggest' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Genereer suggesties
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!employeeId || busy != null}
                onClick={() => void handleGenerate('regenerate')}
              >
                {busy === 'regenerate' ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Genereer nieuwe
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={
                !employeeId || busy != null || kept.length < FUNCTIE_FINAL_MIN_COUNT
              }
              onClick={() => void handleFinalize()}
            >
              {busy === 'finalize' ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Toepassen op trajectplan
            </Button>
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {warnings.length > 0 ? (
          <p className="text-xs text-amber-700">{warnings.join(' · ')}</p>
        ) : null}

        {kept.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Behouden ({kept.length})
            </p>
            {kept.map((s) => (
              <SuggestionRow
                key={s.id}
                checked
                naam={s.naam}
                toelichting={s.toelichting}
                onCheckedChange={(checked) =>
                  setDraftState(
                    toggleSuggestionStatus(draft, s.id, checked ? 'kept' : 'rejected')
                  )
                }
                onNaamChange={(naam) =>
                  setDraftState(updateSuggestionFields(draft, s.id, { naam }))
                }
                onToelichtingChange={(toelichting) =>
                  setDraftState(updateSuggestionFields(draft, s.id, { toelichting }))
                }
              />
            ))}
          </div>
        ) : null}

        {pending.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Suggesties ({pending.length}) — vink aan om te behouden
            </p>
            {pending.map((s) => (
              <SuggestionRow
                key={s.id}
                checked={false}
                naam={s.naam}
                toelichting={s.toelichting}
                onCheckedChange={(checked) =>
                  setDraftState(
                    toggleSuggestionStatus(draft, s.id, checked ? 'kept' : 'pending')
                  )
                }
                onNaamChange={(naam) =>
                  setDraftState(updateSuggestionFields(draft, s.id, { naam }))
                }
                onToelichtingChange={(toelichting) =>
                  setDraftState(updateSuggestionFields(draft, s.id, { toelichting }))
                }
              />
            ))}
          </div>
        ) : null}

        {!hasDraft ? (
          <p className="text-xs text-muted-foreground">
            Genereer vijf suggesties, selecteer welke je wilt behouden, en pas ze toe op het
            trajectplan. Optioneel: schrijf feedback en genereer nieuwe suggesties.
          </p>
        ) : null}

        {hasDraft ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Feedback voor nieuwe suggesties (optioneel)
            </label>
            <textarea
              className={TEXTAREA_CLASS}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="Bijv. meer administratief, geen klantcontact, weinig reistijd…"
            />
          </div>
        ) : null}
      </div>

      <div>
        <button
          type="button"
          className="mb-1 text-xs font-medium text-muted-foreground underline underline-offset-2"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? 'Handmatig bewerken verbergen' : 'Handmatig bewerken'}
        </button>
        {showManual ? (
          <textarea
            className={TEXTAREA_CLASS}
            value={parsed.functieBullets}
            onChange={(e) => syncManualBulletsToDraft(e.target.value)}
            rows={6}
            placeholder="• Functienaam: toelichting"
          />
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Footer</label>
        <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-xs italic text-muted-foreground">
          {parsed.footer || FUNCTIE_FOOTER}
        </p>
      </div>
      {previewRaw.trim() ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <VisieLoopbaanadviseurBlock text={previewRaw} className="text-sm leading-relaxed" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionRow({
  checked,
  naam,
  toelichting,
  onCheckedChange,
  onNaamChange,
  onToelichtingChange,
}: {
  checked: boolean;
  naam: string;
  toelichting: string;
  onCheckedChange: (checked: boolean) => void;
  onNaamChange: (naam: string) => void;
  onToelichtingChange: (toelichting: string) => void;
}) {
  return (
    <div className="flex gap-2 rounded-md border border-border/60 bg-background p-2">
      <input
        type="checkbox"
        className="mt-1.5 h-4 w-4 shrink-0 accent-[#6d2a96]"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        aria-label={`Behouden: ${naam}`}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <input
          className={INPUT_CLASS}
          value={naam}
          onChange={(e) => onNaamChange(e.target.value)}
          aria-label="Functienaam"
        />
        <input
          className={INPUT_CLASS}
          value={toelichting}
          onChange={(e) => onToelichtingChange(e.target.value)}
          aria-label="Toelichting"
          placeholder="Korte toelichting"
        />
      </div>
    </div>
  );
}
