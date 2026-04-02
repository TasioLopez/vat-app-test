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

type UnsavedChangesGuardValue = {
  isDirty: boolean;
  setDirty: (v: boolean) => void;
  pendingNavigateTo: string | null;
  setPendingNavigateTo: (href: string | null) => void;
  onSaveBeforeLeave: (() => Promise<void>) | null;
  setOnSaveBeforeLeave: (fn: (() => Promise<void>) | null) => void;
  attemptNavigate: (href: string) => void;
};

const Ctx = createContext<UnsavedChangesGuardValue | undefined>(undefined);

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isDirty, setDirty] = useState(false);
  const [pendingNavigateTo, setPendingNavigateTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const onSaveBeforeLeaveRef = useRef<(() => Promise<void>) | null>(null);
  const pendingHrefRef = useRef<string | null>(null);

  const setOnSaveBeforeLeave = useCallback((fn: (() => Promise<void>) | null) => {
    onSaveBeforeLeaveRef.current = fn;
  }, []);

  const attemptNavigate = useCallback(
    (href: string) => {
      if (!isDirty) {
        router.push(href);
        return;
      }
      pendingHrefRef.current = href;
      setPendingNavigateTo(href);
    },
    [isDirty, router]
  );

  const closeDialog = useCallback(() => {
    setPendingNavigateTo(null);
    pendingHrefRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    const href = pendingHrefRef.current;
    setDirty(false);
    closeDialog();
    if (href) router.push(href);
  }, [closeDialog, router]);

  const handleSave = useCallback(async () => {
    const href = pendingHrefRef.current;
    const save = onSaveBeforeLeaveRef.current;
    if (!save) {
      setDirty(false);
      closeDialog();
      if (href) router.push(href);
      return;
    }
    setSaving(true);
    try {
      await save();
      setDirty(false);
      closeDialog();
      if (href) router.push(href);
    } catch (err) {
      console.error('Save before leave failed:', err);
      // Keep dialog open; do not navigate
    } finally {
      setSaving(false);
    }
  }, [closeDialog, router]);

  const value = useMemo(
    () => ({
      isDirty,
      setDirty,
      pendingNavigateTo,
      setPendingNavigateTo,
      onSaveBeforeLeave: null,
      setOnSaveBeforeLeave,
      attemptNavigate,
    }),
    [isDirty, pendingNavigateTo, setOnSaveBeforeLeave, attemptNavigate]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        open={pendingNavigateTo != null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saving={saving}
      />
    </Ctx.Provider>
  );
}

export function useUnsavedChangesGuard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUnsavedChangesGuard must be used within UnsavedChangesGuardProvider');
  return ctx;
}
