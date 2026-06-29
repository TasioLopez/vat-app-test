'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import UnsavedChangesDialog from '@/components/tp/UnsavedChangesDialog';
import type { AutosaveStatus } from '@/lib/unsaved/debounced-autosave';

export type LeaveAction =
  | { type: 'navigate'; href: string }
  | { type: 'replace'; href: string }
  | { type: 'back' }
  | { type: 'callback'; fn: () => void };

type UnsavedChangesGuardValue = {
  isDirty: boolean;
  isBlocking: boolean;
  saveStatus: AutosaveStatus;
  setDirty: (v: boolean) => void;
  setSaveStatus: (status: AutosaveStatus) => void;
  pendingNavigateTo: string | null;
  setOnSaveBeforeLeave: (fn: (() => Promise<void>) | null) => void;
  attemptNavigate: (href: string) => void;
  attemptReplace: (href: string) => void;
  attemptLeave: (action: LeaveAction) => void;
  requestLeaveConfirmation: (action: LeaveAction) => void;
};

const Ctx = createContext<UnsavedChangesGuardValue | undefined>(undefined);

function isBlockingState(isDirty: boolean, saveStatus: AutosaveStatus): boolean {
  return isDirty || saveStatus === 'saving' || saveStatus === 'error';
}

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isDirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle');
  const [pendingNavigateTo, setPendingNavigateTo] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSaveBeforeLeaveRef = useRef<(() => Promise<void>) | null>(null);
  const pendingActionRef = useRef<LeaveAction | null>(null);
  const inFlightSaveRef = useRef<Promise<void> | null>(null);

  const isBlocking = isBlockingState(isDirty, saveStatus);

  const setOnSaveBeforeLeave = useCallback((fn: (() => Promise<void>) | null) => {
    onSaveBeforeLeaveRef.current = fn;
  }, []);

  const executeLeaveAction = useCallback(
    (action: LeaveAction) => {
      switch (action.type) {
        case 'navigate':
          router.push(action.href);
          break;
        case 'replace':
          router.replace(action.href);
          break;
        case 'back':
          router.back();
          break;
        case 'callback':
          action.fn();
          break;
      }
    },
    [router]
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setPendingNavigateTo(null);
    pendingActionRef.current = null;
  }, []);

  const requestLeaveConfirmation = useCallback(
    (action: LeaveAction) => {
      if (!isBlocking) {
        executeLeaveAction(action);
        return;
      }
      pendingActionRef.current = action;
      if (action.type === 'navigate' || action.type === 'replace') {
        setPendingNavigateTo(action.href);
      } else {
        setPendingNavigateTo('__leave__');
      }
      setDialogOpen(true);
    },
    [isBlocking, executeLeaveAction]
  );

  const attemptNavigate = useCallback(
    (href: string) => {
      requestLeaveConfirmation({ type: 'navigate', href });
    },
    [requestLeaveConfirmation]
  );

  const attemptReplace = useCallback(
    (href: string) => {
      requestLeaveConfirmation({ type: 'replace', href });
    },
    [requestLeaveConfirmation]
  );

  const attemptLeave = useCallback(
    (action: LeaveAction) => {
      requestLeaveConfirmation(action);
    },
    [requestLeaveConfirmation]
  );

  const runSave = useCallback(async () => {
    if (inFlightSaveRef.current) {
      return inFlightSaveRef.current;
    }
    const save = onSaveBeforeLeaveRef.current;
    if (!save) return;

    const promise = (async () => {
      setSaving(true);
      try {
        await save();
        setDirty(false);
        setSaveStatus('saved');
      } finally {
        setSaving(false);
        inFlightSaveRef.current = null;
      }
    })();

    inFlightSaveRef.current = promise;
    return promise;
  }, []);

  const handleDiscard = useCallback(() => {
    const action = pendingActionRef.current;
    setDirty(false);
    setSaveStatus('idle');
    closeDialog();
    if (action) executeLeaveAction(action);
  }, [closeDialog, executeLeaveAction]);

  const handleSave = useCallback(async () => {
    const action = pendingActionRef.current;
    const save = onSaveBeforeLeaveRef.current;

    if (!save) {
      setDirty(false);
      setSaveStatus('idle');
      closeDialog();
      if (action) executeLeaveAction(action);
      return;
    }

    setSaving(true);
    try {
      if (inFlightSaveRef.current) {
        await inFlightSaveRef.current;
      } else {
        await save();
        setDirty(false);
        setSaveStatus('saved');
      }
      closeDialog();
      if (action) executeLeaveAction(action);
    } catch (err) {
      console.error('Save before leave failed:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [closeDialog, executeLeaveAction]);

  const value = useMemo(
    () => ({
      isDirty,
      isBlocking,
      saveStatus,
      setDirty,
      setSaveStatus,
      pendingNavigateTo,
      setOnSaveBeforeLeave,
      attemptNavigate,
      attemptReplace,
      attemptLeave,
      requestLeaveConfirmation,
    }),
    [
      isDirty,
      isBlocking,
      saveStatus,
      pendingNavigateTo,
      setOnSaveBeforeLeave,
      attemptNavigate,
      attemptReplace,
      attemptLeave,
      requestLeaveConfirmation,
    ]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !saving) closeDialog();
        }}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saving={saving || saveStatus === 'saving'}
        saveError={saveStatus === 'error'}
      />
    </Ctx.Provider>
  );
}

export function useUnsavedChangesGuard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUnsavedChangesGuard must be used within UnsavedChangesGuardProvider');
  return ctx;
}

/** Optional hook for pages outside dashboard layout (guest CV). */
export function useOptionalUnsavedChangesGuard() {
  return useContext(Ctx);
}
