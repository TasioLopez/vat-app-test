'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';

type Props = {
  field: TP2026FieldDef;
  value: any;
  onChange: (value: any) => void;
};

export default function FieldControl({ field, value, onChange }: Props) {
  const commonLabel = <label className="block text-sm font-semibold text-foreground mb-1">{field.label}</label>;

  if (field.type === 'readonly') {
    return (
      <div>
        {commonLabel}
        <div className="w-full border px-3 py-2 rounded-md bg-muted text-muted-foreground">{value || '—'}</div>
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div>
        {commonLabel}
        <Input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (field.type === 'boolean') {
    const v = value === true ? 'ja' : value === false ? 'nee' : '';
    return (
      <div>
        {commonLabel}
        <Select value={v || undefined} onValueChange={(x) => onChange(x === 'ja')}>
          <SelectTrigger>
            <SelectValue placeholder="Selecteer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ja">Ja</SelectItem>
            <SelectItem value="nee">Nee</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'select' && field.options?.length) {
    return (
      <div>
        {commonLabel}
        <Select value={value || undefined} onValueChange={(x) => onChange(x)}>
          <SelectTrigger>
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
      </div>
    );
  }

  if (field.type === 'multiline') {
    return (
      <div>
        {commonLabel}
        <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} className="min-h-[100px]" />
      </div>
    );
  }

  return (
    <div>
      {commonLabel}
      <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
