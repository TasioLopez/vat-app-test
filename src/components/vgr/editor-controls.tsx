'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDebouncedSync } from '@/hooks/useDebouncedSync';
import { cn } from '@/lib/utils';
import type { JaNee, VGRQuoteBlock } from '@/lib/vgr/schema';

/** Template instruction (editor only, never exported). */
export function Instructie({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900">
      <span className="font-semibold">Instructie: </span>
      {children}
    </p>
  );
}

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-foreground">
      {children}
      {hint ? <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function DebouncedTextarea({
  value,
  onChange,
  rows = 5,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { value: draft, setDraft } = useDebouncedSync({ external: value ?? '', onSync: onChange });
  return (
    <Textarea
      value={draft}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className={cn('min-h-[90px] resize-y text-sm leading-relaxed', className)}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

export function DebouncedInput({
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  const { value: draft, setDraft } = useDebouncedSync({ external: value ?? '', onSync: onChange });
  return (
    <Input
      type={type}
      value={draft}
      placeholder={placeholder}
      className={className}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

export function JaNeeControl({
  value,
  onChange,
  name,
  jaLabel = 'Ja',
  neeLabel = 'Nee',
}: {
  value: JaNee;
  onChange: (v: boolean) => void;
  name: string;
  jaLabel?: string;
  neeLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label={name}>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
        <input type="radio" name={name} className="h-4 w-4" checked={value === true} onChange={() => onChange(true)} />
        {jaLabel}
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
        <input type="radio" name={name} className="h-4 w-4" checked={value === false} onChange={() => onChange(false)} />
        {neeLabel}
      </label>
    </div>
  );
}

export function CheckboxRow({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors',
        checked ? 'border-[#702A90]/60 bg-[#702A90]/10' : 'border-border bg-background hover:bg-muted/50',
        className
      )}
    >
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function StringListEditor({
  items,
  onChange,
  placeholder = 'Toevoegen…',
  addLabel = 'Regel toevoegen',
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <DebouncedInput
            className="h-8 text-sm"
            value={it}
            placeholder={placeholder}
            onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
          />
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
            aria-label="Verwijderen"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => onChange([...items, ''])}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}

export function QuoteEditor({
  value,
  onChange,
  bronTypePlaceholder = 'bijv. het belastbaarheidsprofiel / de terugkoppeling van het medisch spreekuur',
  naamLabel = 'Naam bedrijfsarts',
}: {
  value: VGRQuoteBlock;
  onChange: (next: VGRQuoteBlock) => void;
  bronTypePlaceholder?: string;
  naamLabel?: string;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{naamLabel}</label>
          <DebouncedInput className="h-8 text-sm" value={value.bron_naam} onChange={(v) => onChange({ ...value, bron_naam: v })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Datum bron</label>
          <Input type="date" className="h-8 text-sm" value={value.bron_datum} onChange={(e) => onChange({ ...value, bron_datum: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Soort bron (optioneel)</label>
          <DebouncedInput className="h-8 text-sm" value={value.bron_type} placeholder={bronTypePlaceholder} onChange={(v) => onChange({ ...value, bron_type: v })} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Citaat (letterlijk overnemen)</label>
        <DebouncedTextarea rows={3} value={value.citaat} onChange={(v) => onChange({ ...value, citaat: v })} />
      </div>
    </div>
  );
}

export function EditorCard({
  id,
  title,
  chapterColor,
  children,
  actions,
}: {
  id: string;
  title: string;
  chapterColor?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section id={`vgr-sec-${id}`} className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#702A90]">
          {chapterColor ? <span className="inline-block h-3 w-1.5 rounded-sm" style={{ backgroundColor: chapterColor }} /> : null}
          {title}
        </h3>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}
