'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AutosaveStatus,
  DebouncedAutosaveController,
} from '@/lib/unsaved/debounced-autosave';

export type { AutosaveStatus };

export type UseDebouncedAutosaveOptions = {
  isDirty: boolean;
  save: () => Promise<void>;
  delay?: number;
  enabled?: boolean;
};

export function useDebouncedAutosave({
  isDirty,
  save,
  delay = 2000,
  enabled = true,
}: UseDebouncedAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const controllerRef = useRef<DebouncedAutosaveController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new DebouncedAutosaveController({
      delay,
      onStatusChange: setSaveStatus,
      onSaved: setLastSavedAt,
    });
  }

  const controller = controllerRef.current;

  useEffect(() => {
    controller.setSaveFn(async () => {
      await saveRef.current();
    });
  }, [controller]);

  useEffect(() => {
    if (!enabled) {
      controller.cancel();
      controllerRef.current = new DebouncedAutosaveController({
        delay,
        onStatusChange: setSaveStatus,
        onSaved: setLastSavedAt,
      });
      return;
    }
    controller.notifyDirty(isDirty);
  }, [isDirty, enabled, controller, delay]);

  useEffect(() => {
    return () => {
      controller.cancel();
    };
  }, [controller]);

  const retrySave = useCallback(async () => {
    await controller.retrySave();
  }, [controller]);

  const cancel = useCallback(() => {
    controller.cancel();
  }, [controller]);

  return {
    saveStatus,
    lastSavedAt,
    retrySave,
    cancel,
    isSaving: saveStatus === 'saving',
    hasError: saveStatus === 'error',
  };
}
