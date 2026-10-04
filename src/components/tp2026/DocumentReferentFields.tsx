'use client';

import FieldControl from '@/components/tp2026/FieldControl';
import { Button } from '@/components/ui/button';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import {
  clearDocumentReferentOverrides,
  getReferentDisplayFields,
  hasDocumentReferentOverride,
  setDocumentReferentField,
} from '@/lib/tp/resolve-profile-context';

const NAME_FIELD: TP2026FieldDef = {
  key: 'document_referent_name',
  label: 'Contactpersoon opdrachtgever',
  type: 'text',
};

const PHONE_FIELD: TP2026FieldDef = {
  key: 'document_referent_phone',
  label: 'Telefoon opdrachtgever',
  type: 'text',
};

const EMAIL_FIELD: TP2026FieldDef = {
  key: 'document_referent_email',
  label: 'E-mail opdrachtgever',
  type: 'text',
};

type Props = {
  data: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
};

export function DocumentReferentFields({ data, updateField }: Props) {
  const display = getReferentDisplayFields(data);
  const hasOverride = hasDocumentReferentOverride(data);

  return (
    <div className="space-y-4">
      <FieldControl
        field={NAME_FIELD}
        value={display.client_referent_name ?? ''}
        onChange={(v) => setDocumentReferentField(updateField, 'client_referent_name', v)}
        layout="stack"
      />
      <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
        <FieldControl
          field={PHONE_FIELD}
          value={display.client_referent_phone ?? ''}
          onChange={(v) => setDocumentReferentField(updateField, 'client_referent_phone', v)}
          layout="stack"
        />
        <FieldControl
          field={EMAIL_FIELD}
          value={display.client_referent_email ?? ''}
          onChange={(v) => setDocumentReferentField(updateField, 'client_referent_email', v)}
          layout="stack"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Alleen voor dit trajectplan; wijzigt de contactpersoon in het systeem niet.
        </p>
        {hasOverride ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => clearDocumentReferentOverrides(updateField)}
          >
            Herstel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
