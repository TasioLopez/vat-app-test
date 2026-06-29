'use client';

import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';

type Props = {
  isDirty: boolean;
  onSave: () => Promise<void>;
};

export default function EmployeeUnsavedGuard({ isDirty, onSave }: Props) {
  return (
    <UnsavedChangesSyncGuard
      isDirty={isDirty}
      onSave={onSave}
      autosave
    />
  );
}
