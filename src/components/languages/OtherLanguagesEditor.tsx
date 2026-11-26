'use client';

import {
  OTHER_LANGUAGE_LEVEL_OPTIONS,
  SUGGESTED_OTHER_LANGUAGES,
  type LanguageProficiency,
} from '@/lib/languages/proficiency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  value: LanguageProficiency[];
  onChange: (next: LanguageProficiency[]) => void;
  /** Compact styling for intake form surfaces. */
  className?: string;
  disabled?: boolean;
};

const LEVEL_SELECT_OPTIONS = OTHER_LANGUAGE_LEVEL_OPTIONS.filter((level) => level !== 'Geen');

export function OtherLanguagesEditor({ value, onChange, className, disabled }: Props) {
  const rows = value ?? [];

  const updateRow = (index: number, patch: Partial<LanguageProficiency>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...rows, { language: '', level: 'Voldoende' }]);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-600">Andere talen</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={addRow}
        >
          Taal toevoegen
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Geen andere talen vastgelegd.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={`lang-${index}`}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center"
            >
              <Input
                list="other-language-suggestions"
                aria-label={`Taal ${index + 1}`}
                placeholder="Bijv. Turks"
                value={row.language}
                disabled={disabled}
                onChange={(event) => updateRow(index, { language: event.target.value })}
              />
              <Select
                value={row.level || undefined}
                disabled={disabled}
                onValueChange={(level) => updateRow(index, { level })}
              >
                <SelectTrigger aria-label={`Niveau ${row.language || index + 1}`}>
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_SELECT_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => removeRow(index)}
              >
                Verwijderen
              </Button>
            </li>
          ))}
        </ul>
      )}

      <datalist id="other-language-suggestions">
        {SUGGESTED_OTHER_LANGUAGES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
