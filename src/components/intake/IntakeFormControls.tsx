'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { SELECT_CLASS } from '@/lib/select-class';

const TEXTAREA_CLASS =
  'w-full min-h-[5.5rem] cursor-text rounded-lg border-2 border-purple-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all duration-200 outline-none hover:border-purple-300 focus-visible:border-purple-500 focus-visible:ring-[3px] focus-visible:ring-purple-500/50 focus-visible:shadow-md focus-visible:shadow-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50';

export function IntakeField({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: 'text' | 'date';
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      {multiline ? (
        <textarea
          className={TEXTAREA_CLASS}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          type={type}
          className="cursor-text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function IntakeSelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <select
        className={cn(SELECT_CLASS, 'cursor-pointer')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Independent on/off chip (multi-select). */
export function IntakeToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200',
        checked
          ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm'
          : 'border-purple-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50/40'
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] leading-none',
          checked
            ? 'border-purple-600 bg-purple-600 text-white'
            : 'border-purple-300 bg-white text-transparent'
        )}
        aria-hidden
      >
        ✓
      </span>
      {label}
    </button>
  );
}

/** Exclusive chip group (one selected, or none if allowClear). */
export function IntakeChipGroup({
  options,
  value,
  onChange,
  allowClear = true,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              if (selected && allowClear) onChange('');
              else onChange(o.value);
            }}
            className={cn(
              'cursor-pointer rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200',
              selected
                ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm'
                : 'border-purple-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50/40'
            )}
            aria-pressed={selected}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
