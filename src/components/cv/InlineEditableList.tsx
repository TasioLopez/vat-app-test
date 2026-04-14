'use client';

import { Plus, X } from 'lucide-react';
import InlineEditableText from '@/components/cv/InlineEditableText';
import { cn } from '@/lib/utils';

type Item = { id: string; text: string };

type Props = {
  title: string;
  items: Item[];
  onChange: (id: string, text: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  className?: string;
  /** Classes for each inline text (e.g. text-white on dark sidebar) */
  itemTextClassName?: string;
  /** Light text on dark background */
  variant?: 'default' | 'sidebar';
};

export default function InlineEditableList({
  title,
  items,
  onChange,
  onAdd,
  onRemove,
  className,
  itemTextClassName = 'text-gray-800',
  variant = 'default',
}: Props) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3
          className={cn(
            'border-b pb-1 text-xs font-semibold uppercase tracking-wide',
            variant === 'sidebar'
              ? 'border-white/30 text-white'
              : 'border-transparent text-[var(--cv-accent)]'
          )}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm print:hidden hover:bg-gray-50"
          aria-label="Toevoegen"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <div className="min-w-0 flex-1">
              <InlineEditableText
                value={item.text}
                onChange={(v) => onChange(item.id, v)}
                className={cn('block w-full text-sm', itemTextClassName)}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
              aria-label="Verwijderen"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
