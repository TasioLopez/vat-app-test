'use client';

import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import { hasNonEmptyFields } from '@/hooks/useFormDirty';

type Props = {
  values: Record<string, unknown>;
  onSave: () => Promise<void>;
  enabled?: boolean;
};

/** Leave protection for create forms (no autosave). "Opslaan" in dialog triggers onSave (submit). */
export default function CreateFormLeaveGuard({ values, onSave, enabled = true }: Props) {
  const isDirty = hasNonEmptyFields(values);

  if (!enabled) return null;

  return (
    <UnsavedChangesSyncGuard
      isDirty={isDirty}
      onSave={onSave}
      autosave={false}
    />
  );
}
