'use client';

import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import type { AutosaveStatus } from '@/hooks/useDebouncedAutosave';

type Props = {
  isDirty: boolean;
  onSave: () => Promise<void>;
  /** Off while the edit form is open, so Annuleren can still discard the changes. */
  autosave?: boolean;
  onAutosaveStatusChange?: (status: AutosaveStatus) => void;
};

export default function EmployeeUnsavedGuard({
  isDirty,
  onSave,
  autosave = true,
  onAutosaveStatusChange,
}: Props) {
  return (
    <UnsavedChangesSyncGuard
      isDirty={isDirty}
      onSave={onSave}
      autosave={autosave}
      onAutosaveStatusChange={onAutosaveStatusChange}
    />
  );
}
