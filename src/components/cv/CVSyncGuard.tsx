'use client';

import { useCV } from '@/context/CVContext';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';

export default function CVSyncGuard() {
  const { isDirty, save } = useCV();

  return (
    <UnsavedChangesSyncGuard
      isDirty={isDirty}
      onSave={() => save()}
      autosave
    />
  );
}
