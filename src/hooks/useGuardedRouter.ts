'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useUnsavedChangesGuard, type LeaveAction } from '@/context/UnsavedChangesGuardContext';

export function useGuardedRouter() {
  const router = useRouter();
  const { attemptNavigate, attemptReplace, attemptLeave } = useUnsavedChangesGuard();

  const push = useCallback(
    (href: string) => {
      attemptNavigate(href);
    },
    [attemptNavigate]
  );

  const replace = useCallback(
    (href: string) => {
      attemptReplace(href);
    },
    [attemptReplace]
  );

  const back = useCallback(() => {
    attemptLeave({ type: 'back' });
  }, [attemptLeave]);

  const leave = useCallback(
    (action: LeaveAction) => {
      attemptLeave(action);
    },
    [attemptLeave]
  );

  return {
    push,
    replace,
    back,
    leave,
    /** Unguarded router for cases where guard is not needed */
    raw: router,
  };
}
