'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TP_ACTIVITIES, {
  formatSpoor2NotitieLabel,
  isSpoor2NotitieEligible,
  resolveSpoor2Selections,
  sanitizeSpoor2Selections,
  type TPActivity,
  type TPActivitySelection,
} from '@/lib/tp/tp_activities';
import { SELECT_CLASS } from '@/lib/select-class';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NOTITIE_DEBOUNCE_MS = 400;

function getSubTextOption(currentSub: string | null, templates: string[]): string {
  if (currentSub === null) return 'geen';
  const idx = templates.indexOf(currentSub);
  if (idx >= 0) return `sjabloon-${idx + 1}`;
  return 'custom';
}

export function Spoor2ActivitiesEditor({
  tp3Activities,
  onChange,
}: {
  tp3Activities: unknown;
  onChange: (next: TPActivitySelection[]) => void;
}) {
  const [editingSubTextForId, setEditingSubTextForId] = useState<string | null>(null);
  const [draftSubText, setDraftSubText] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftRef = useRef<{ id: string; value: string } | null>(null);

  const selections = useMemo(() => resolveSpoor2Selections(tp3Activities), [tp3Activities]);
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;

  const persist = useCallback(
    (next: TPActivitySelection[]) => {
      onChange(sanitizeSpoor2Selections(next));
    },
    [onChange]
  );

  const getSubText = (id: string) => selections.find((s) => s.id === id)?.subText ?? null;

  const setSubText = useCallback(
    (id: string, value: string | null) => {
      const next = selectionsRef.current.map((s) => (s.id === id ? { ...s, subText: value } : s));
      persist(next);
    },
    [persist]
  );

  const flushPendingDraft = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const pending = pendingDraftRef.current;
    if (!pending) return;
    pendingDraftRef.current = null;
    setSubText(pending.id, pending.value);
  }, [setSubText]);

  const scheduleSubText = useCallback(
    (id: string, value: string) => {
      setDraftSubText(value);
      pendingDraftRef.current = { id, value };
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const pending = pendingDraftRef.current;
        if (!pending) return;
        pendingDraftRef.current = null;
        setSubText(pending.id, pending.value);
      }, NOTITIE_DEBOUNCE_MS);
    },
    [setSubText]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const pending = pendingDraftRef.current;
      if (pending) {
        pendingDraftRef.current = null;
        const next = selectionsRef.current.map((s) =>
          s.id === pending.id ? { ...s, subText: pending.value } : s
        );
        onChange(sanitizeSpoor2Selections(next));
      }
    };
  }, [onChange]);

  const openSubTextEditor = (id: string, initial: string) => {
    flushPendingDraft();
    setDraftSubText(initial);
    setEditingSubTextForId(id);
  };

  const closeSubTextEditor = () => {
    flushPendingDraft();
    setEditingSubTextForId(null);
  };

  const toggleActivity = (id: string) => {
    flushPendingDraft();
    const isSelected = selections.some((s) => s.id === id);
    const next = isSelected
      ? selections.filter((s) => s.id !== id)
      : [...selections, { id, subText: null }];
    persist(next);
    if (isSelected && editingSubTextForId === id) setEditingSubTextForId(null);
    if (!isSelected) setEditingSubTextForId(null);
  };

  return (
    <div className="space-y-2">
      {TP_ACTIVITIES.map((a: TPActivity) => {
        const checked = selections.some((s) => s.id === a.id);
        const templates = a.subTextTemplates ?? [];
        const canAddNotitie = checked && isSpoor2NotitieEligible(a.id) && templates.length === 3;
        const currentSub = getSubText(a.id);
        const subTextOption = getSubTextOption(currentSub, templates);
        const isEditing = editingSubTextForId === a.id;
        const previewSub = isEditing ? draftSubText : currentSub;

        return (
          <div
            key={a.id}
            className="space-y-2 rounded-md border border-border p-2 transition-colors hover:bg-muted/50"
          >
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={() => toggleActivity(a.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{a.body}</div>
              </div>
            </label>
            {canAddNotitie ? (
              <div className="ml-6 space-y-1 border-l border-border pl-2">
                <label className="text-xs text-muted-foreground">Notitie:</label>
                <Select
                  value={subTextOption}
                  onValueChange={(v) => {
                    flushPendingDraft();
                    if (v === 'geen') {
                      setSubText(a.id, null);
                      setEditingSubTextForId(null);
                    } else if (v === 'sjabloon-1') {
                      setSubText(a.id, templates[0]);
                      setEditingSubTextForId(null);
                    } else if (v === 'sjabloon-2') {
                      setSubText(a.id, templates[1]);
                      setEditingSubTextForId(null);
                    } else if (v === 'sjabloon-3') {
                      setSubText(a.id, templates[2]);
                      setEditingSubTextForId(null);
                    } else if (v === 'custom') {
                      const initial = currentSub ?? '';
                      setSubText(a.id, initial);
                      openSubTextEditor(a.id, initial);
                    }
                  }}
                >
                  <SelectTrigger className={SELECT_CLASS}>
                    <SelectValue placeholder="Notitie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">Geen</SelectItem>
                    <SelectItem value="sjabloon-1">{formatSpoor2NotitieLabel(templates[0])}</SelectItem>
                    <SelectItem value="sjabloon-2">{formatSpoor2NotitieLabel(templates[1])}</SelectItem>
                    <SelectItem value="sjabloon-3">{formatSpoor2NotitieLabel(templates[2])}</SelectItem>
                    <SelectItem value="custom">Aangepast</SelectItem>
                  </SelectContent>
                </Select>
                {(currentSub != null && currentSub !== '') || isEditing ? (
                  <>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {previewSub ?? ''}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => {
                        if (isEditing) {
                          closeSubTextEditor();
                        } else {
                          openSubTextEditor(a.id, currentSub ?? '');
                        }
                      }}
                    >
                      {isEditing ? 'Sluiten' : 'Bewerken'}
                    </button>
                    {isEditing ? (
                      <textarea
                        className="mt-1 min-h-[60px] w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        value={draftSubText}
                        onChange={(e) => scheduleSubText(a.id, e.target.value)}
                        onBlur={flushPendingDraft}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
