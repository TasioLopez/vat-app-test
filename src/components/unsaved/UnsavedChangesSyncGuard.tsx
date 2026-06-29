'use client';

import { useEffect, useRef } from 'react';
import { useOptionalUnsavedChangesGuard } from '@/context/UnsavedChangesGuardContext';
import { useDebouncedAutosave, type AutosaveStatus } from '@/hooks/useDebouncedAutosave';

type Props = {
  isDirty: boolean;
  onSave: () => Promise<void>;
  saveStatus?: AutosaveStatus;
  enabled?: boolean;
  autosave?: boolean;
  autosaveDelay?: number;
  onAutosaveStatusChange?: (status: AutosaveStatus) => void;
};

export default function UnsavedChangesSyncGuard({
  isDirty,
  onSave,
  saveStatus: externalSaveStatus,
  enabled = true,
  autosave = false,
  autosaveDelay = 2000,
  onAutosaveStatusChange,
}: Props) {
  const ctx = useOptionalUnsavedChangesGuard();
  if (!ctx) {
    throw new Error('UnsavedChangesSyncGuard requires UnsavedChangesGuardProvider');
  }
  const { setDirty, setSaveStatus, setOnSaveBeforeLeave, requestLeaveConfirmation } = ctx;

  const autosaveHook = useDebouncedAutosave({
    isDirty,
    save: onSave,
    delay: autosaveDelay,
    enabled: enabled && autosave,
  });

  const effectiveSaveStatus = autosave
    ? autosaveHook.saveStatus
    : externalSaveStatus ?? (isDirty ? 'dirty' : 'idle');

  const isBlocking =
    isDirty ||
    effectiveSaveStatus === 'saving' ||
    effectiveSaveStatus === 'error';

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    onAutosaveStatusChange?.(effectiveSaveStatus);
  }, [effectiveSaveStatus, onAutosaveStatusChange]);

  useEffect(() => {
    if (!enabled) {
      setDirty(false);
      setSaveStatus('idle');
      return;
    }
    setDirty(isBlocking);
    setSaveStatus(effectiveSaveStatus);
  }, [isBlocking, effectiveSaveStatus, enabled, setDirty, setSaveStatus]);

  useEffect(() => {
    if (!enabled) {
      setOnSaveBeforeLeave(null);
      return;
    }
    setOnSaveBeforeLeave(async () => {
      await onSaveRef.current();
    });
    return () => {
      setOnSaveBeforeLeave(null);
      setDirty(false);
      setSaveStatus('idle');
    };
  }, [enabled, setOnSaveBeforeLeave, setDirty, setSaveStatus]);

  useEffect(() => {
    if (!enabled || !isBlocking) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, isBlocking]);

  useEffect(() => {
    if (!enabled || !isBlocking) return;

    const trapState = { unsavedGuard: true };
    history.pushState(trapState, '');

    const onPopState = () => {
      if (!isBlocking) return;
      history.pushState(trapState, '');
      requestLeaveConfirmation({ type: 'back' });
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [enabled, isBlocking, requestLeaveConfirmation]);

  return null;
}
