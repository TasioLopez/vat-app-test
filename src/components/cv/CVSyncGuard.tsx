'use client';

import { useEffect } from 'react';
import { useCV } from '@/context/CVContext';
import { useUnsavedChangesGuard } from '@/context/UnsavedChangesGuardContext';

export default function CVSyncGuard() {
  const { isDirty, save } = useCV();
  const { setDirty, setOnSaveBeforeLeave } = useUnsavedChangesGuard();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  useEffect(() => {
    setOnSaveBeforeLeave(async () => {
      await save();
    });
    return () => {
      setOnSaveBeforeLeave(null);
      setDirty(false);
    };
  }, [save, setOnSaveBeforeLeave, setDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return null;
}
