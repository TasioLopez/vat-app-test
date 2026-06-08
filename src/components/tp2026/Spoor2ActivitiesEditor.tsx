'use client';

import React, { useMemo, useState } from 'react';
import TP_ACTIVITIES, {
  resolveSpoor2Selections,
  type TPActivity,
  type TPActivitySelection,
} from '@/lib/tp/tp_activities';
import { SELECT_CLASS } from '@/lib/select-class';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const selections = useMemo(() => resolveSpoor2Selections(tp3Activities), [tp3Activities]);

  const getSubText = (id: string) => selections.find((s) => s.id === id)?.subText ?? null;

  const setSubText = (id: string, value: string | null) => {
    const next = selections.map((s) => (s.id === id ? { ...s, subText: value } : s));
    onChange(next);
  };

  const toggleActivity = (id: string) => {
    const isSelected = selections.some((s) => s.id === id);
    const next = isSelected
      ? selections.filter((s) => s.id !== id)
      : [...selections, { id, subText: null }];
    onChange(next);
    if (!isSelected) setEditingSubTextForId(null);
  };

  return (
    <div className="space-y-2">
      {TP_ACTIVITIES.map((a: TPActivity) => {
        const checked = selections.some((s) => s.id === a.id);
        const templates = a.subTextTemplates ?? [];
        const hasTemplates = templates.length === 3;
        const currentSub = getSubText(a.id);
        const subTextOption = getSubTextOption(currentSub, templates);

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
            {checked && hasTemplates ? (
              <div className="ml-6 space-y-1 border-l border-border pl-2">
                <label className="text-xs text-muted-foreground">Subtekst (Z-logo):</label>
                <Select
                  value={subTextOption}
                  onValueChange={(v) => {
                    if (v === 'geen') setSubText(a.id, null);
                    else if (v === 'sjabloon-1') setSubText(a.id, templates[0]);
                    else if (v === 'sjabloon-2') setSubText(a.id, templates[1]);
                    else if (v === 'sjabloon-3') setSubText(a.id, templates[2]);
                    else if (v === 'custom') {
                      setSubText(a.id, currentSub ?? '');
                      setEditingSubTextForId(a.id);
                    }
                  }}
                >
                  <SelectTrigger className={SELECT_CLASS}>
                    <SelectValue placeholder="Subtekst" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">Geen</SelectItem>
                    <SelectItem value="sjabloon-1">Sjabloon 1</SelectItem>
                    <SelectItem value="sjabloon-2">Sjabloon 2</SelectItem>
                    <SelectItem value="sjabloon-3">Sjabloon 3</SelectItem>
                    <SelectItem value="custom">Aangepast</SelectItem>
                  </SelectContent>
                </Select>
                {currentSub != null && currentSub !== '' ? (
                  <>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{currentSub}</div>
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setEditingSubTextForId(editingSubTextForId === a.id ? null : a.id)}
                    >
                      {editingSubTextForId === a.id ? 'Sluiten' : 'Bewerken'}
                    </button>
                    {editingSubTextForId === a.id ? (
                      <textarea
                        className="mt-1 min-h-[60px] w-full rounded border border-border bg-background px-2 py-1 text-sm"
                        value={currentSub}
                        onChange={(e) => setSubText(a.id, e.target.value)}
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
