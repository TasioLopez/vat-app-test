'use client';

import { useEffect } from 'react';
import { useCV } from '@/context/CVContext';

/** Guest share page: warn on tab close when CV has unsaved changes (no dashboard guard provider). */
export default function CVGuestSyncGuard() {
  const { isDirty } = useCV();

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
