'use client';

import FieldControl from '@/components/tp2026/FieldControl';
import { Button } from '@/components/ui/button';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { getProfileWerkgeverName } from '@/lib/tp/resolve-profile-context';

const DOCUMENT_EMPLOYER_FIELD: TP2026FieldDef = {
  key: 'document_employer_name',
  label: 'Opdrachtgever',
  type: 'text',
  placeholder: 'Naam werkgever op dit trajectplan',
};

type Props = {
  data: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
  /** Gegevens uses "Werkgever"; Cover uses schema label "Opdrachtgever". */
  label?: string;
};

export function DocumentEmployerNameField({
  data,
  updateField,
  label = DOCUMENT_EMPLOYER_FIELD.label,
}: Props) {
  const overrideRaw = String(data.document_employer_name ?? '');
  const hasOverride = overrideRaw.trim().length > 0;
  const displayValue = hasOverride ? overrideRaw : getProfileWerkgeverName(data);
  const field: TP2026FieldDef = { ...DOCUMENT_EMPLOYER_FIELD, label };

  return (
    <div className="space-y-1.5">
      <FieldControl
        field={field}
        value={displayValue}
        onChange={(v) => {
          const next = String(v ?? '').trim();
          updateField('document_employer_name', next);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Alleen voor dit trajectplan; wijzigt de werkgever in het systeem niet.
        </p>
        {hasOverride ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => updateField('document_employer_name', '')}
          >
            Herstel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
