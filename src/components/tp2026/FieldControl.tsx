'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  COMPUTER_SKILLS_OPTIONS,
  DRIVERS_LICENSE_TYPE_OPTIONS,
} from '@/lib/tp2026/gegevens-field-options';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';

export type FieldControlLayout = 'stack' | 'row';

type Props = {
  field: TP2026FieldDef;
  value: any;
  onChange: (value: any) => void;
  layout?: FieldControlLayout;
  compactBoolean?: boolean;
  minRows?: number;
  disabled?: boolean;
  className?: string;
};

function normalizeMultiselectValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.length > 0);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function CompactBooleanControl({
  fieldKey,
  value,
  onChange,
  disabled,
}: {
  fieldKey: string;
  value: boolean | null | undefined;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const jaChecked = value === true;
  const neeChecked = value === false;

  return (
    <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label={fieldKey}>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
        <input
          type="radio"
          name={fieldKey}
          className="h-4 w-4"
          checked={jaChecked}
          disabled={disabled}
          onChange={() => onChange(true)}
        />
        Ja
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
        <input
          type="radio"
          name={fieldKey}
          className="h-4 w-4"
          checked={neeChecked}
          disabled={disabled}
          onChange={() => onChange(false)}
        />
        Nee
      </label>
    </div>
  );
}

function MultiselectControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: TP2026FieldDef;
  value: unknown;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const selected = normalizeMultiselectValue(value);
  const options =
    field.key === 'drivers_license_type'
      ? DRIVERS_LICENSE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
      : (field.options || []).map((opt) => ({ value: opt, label: opt }));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors',
              isSelected
                ? 'border-[#6d2a96]/60 bg-[#6d2a96]/10 text-foreground'
                : 'border-border bg-background hover:bg-muted/50',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-border"
              checked={isSelected}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, option.value]);
                } else {
                  onChange(selected.filter((v) => v !== option.value));
                }
              }}
            />
            <span className="leading-snug">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function FieldShell({
  field,
  layout,
  className,
  control,
}: {
  field: TP2026FieldDef;
  layout: FieldControlLayout;
  className?: string;
  control: React.ReactNode;
}) {
  const effectiveLayout = layout === 'row' ? 'row' : 'stack';

  if (effectiveLayout === 'row') {
    return (
      <div className={cn('grid grid-cols-[minmax(0,38%)_1fr] items-center gap-x-3 gap-y-1', className)}>
        <label className="text-sm font-semibold leading-snug text-foreground">{field.label}</label>
        <div className="min-w-0">{control}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{field.label}</label>
      {control}
    </div>
  );
}

export default function FieldControl({
  field,
  value,
  onChange,
  layout = 'stack',
  compactBoolean = false,
  minRows,
  disabled = false,
  className,
}: Props) {
  const multilineMinRows = minRows ?? 4;

  if (field.type === 'readonly') {
    return (
      <FieldShell
        field={field}
        layout={layout}
        className={className}
        control={
          <div className="w-full rounded-md border bg-muted px-3 py-2 text-muted-foreground">{value || '—'}</div>
        }
      />
    );
  }

  if (field.type === 'date') {
    return (
      <FieldShell
        field={field}
        layout={layout}
        className={className}
        control={
          <Input
            type="date"
            className="w-full"
            value={value || ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        }
      />
    );
  }

  if (field.type === 'boolean') {
    if (compactBoolean) {
      return (
        <FieldShell
          field={field}
          layout={layout}
          className={className}
          control={
            <CompactBooleanControl
              fieldKey={field.key}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          }
        />
      );
    }

    const v = value === true ? 'ja' : value === false ? 'nee' : '';
    return (
      <FieldShell
        field={field}
        layout={layout}
        className={className}
        control={
          <Select value={v || undefined} onValueChange={(x) => onChange(x === 'ja')} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">Ja</SelectItem>
              <SelectItem value="nee">Nee</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    );
  }

  if (field.type === 'multiselect' && field.options?.length) {
    return (
      <FieldShell
        field={field}
        layout="stack"
        className={className}
        control={
          <MultiselectControl field={field} value={value} onChange={onChange} disabled={disabled} />
        }
      />
    );
  }

  if (field.type === 'select' && field.options?.length) {
    const isComputerSkills = field.key === 'computer_skills';
    const selectOptions = isComputerSkills
      ? COMPUTER_SKILLS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
      : field.options.map((opt) => ({ value: opt, label: opt }));

    return (
      <FieldShell
        field={field}
        layout={layout}
        className={className}
        control={
          <Select value={value || undefined} onValueChange={(x) => onChange(x)} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    );
  }

  if (field.type === 'multiline') {
    return (
      <FieldShell
        field={field}
        layout="stack"
        className={className}
        control={
          <Textarea
            value={value || ''}
            disabled={disabled}
            rows={multilineMinRows}
            className="min-h-[80px] resize-y"
            onChange={(e) => onChange(e.target.value)}
          />
        }
      />
    );
  }

  return (
    <FieldShell
      field={field}
      layout={layout}
      className={className}
      control={
        <Input
          className="w-full"
          value={value || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      }
    />
  );
}
