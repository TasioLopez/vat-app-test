'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function FieldShell({
  field,
  layout,
  className,
  label,
  control,
}: {
  field: TP2026FieldDef;
  layout: FieldControlLayout;
  className?: string;
  label: React.ReactNode;
  control: React.ReactNode;
}) {
  if (layout === 'row') {
    return (
      <div className={cn('grid grid-cols-[minmax(0,38%)_1fr] items-center gap-x-3 gap-y-1', className)}>
        <label className="text-sm font-semibold leading-snug text-foreground">{field.label}</label>
        <div className="min-w-0">{control}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-semibold text-foreground">{field.label}</label>
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
        label={field.label}
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
        label={field.label}
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
          label={field.label}
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
        label={field.label}
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

  if (field.type === 'select' && field.options?.length) {
    return (
      <FieldShell
        field={field}
        layout={layout}
        className={className}
        label={field.label}
        control={
          <Select value={value || undefined} onValueChange={(x) => onChange(x)} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecteer" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
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
        label={field.label}
        control={
          <Textarea
            value={value || ''}
            disabled={disabled}
            rows={multilineMinRows}
            className="min-h-0 resize-y"
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
      label={field.label}
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
