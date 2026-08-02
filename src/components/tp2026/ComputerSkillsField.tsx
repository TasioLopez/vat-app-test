'use client';

import FieldControl from '@/components/tp2026/FieldControl';
import { Input } from '@/components/ui/input';
import {
  getComputerSkillsDefaultDescription,
  nextComputerSkillsDescriptionOnLevelChange,
} from '@/lib/tp2026/gegevens-field-options';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';

type Props = {
  field: TP2026FieldDef;
  level: string | null | undefined;
  description: string | null | undefined;
  updateField: (key: string, value: unknown) => void;
  disabled?: boolean;
};

export function ComputerSkillsField({
  field,
  level,
  description,
  updateField,
  disabled,
}: Props) {
  const showDescription = Boolean(level && level !== '1');

  return (
    <div className="space-y-2">
      <FieldControl
        field={field}
        value={level}
        disabled={disabled}
        layout="stack"
        onChange={(v) => {
          const nextLevel = String(v ?? '');
          updateField('computer_skills', nextLevel);
          updateField(
            'computer_skills_description',
            nextComputerSkillsDescriptionOnLevelChange(level, nextLevel, description)
          );
        }}
      />
      {showDescription ? (
        <div className="flex items-center gap-1 text-sm text-foreground">
          <span className="shrink-0 text-muted-foreground">(</span>
          <Input
            className="min-w-0 flex-1"
            disabled={disabled}
            value={
              description ?? getComputerSkillsDefaultDescription(level)
            }
            onChange={(e) => updateField('computer_skills_description', e.target.value)}
            placeholder={getComputerSkillsDefaultDescription(level)}
          />
          <span className="shrink-0 text-muted-foreground">)</span>
        </div>
      ) : null}
    </div>
  );
}
