'use client';

import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import { useUnsavedChangesGuard } from '@/context/UnsavedChangesGuardContext';

type Props = {
  open: boolean;
  isDirty: boolean;
  onSave: () => Promise<void>;
  onClose: () => void;
  autosave?: boolean;
};

/**
 * Registers unsaved-changes guard while a modal editor is open.
 * Intercepts onClose when dirty via the global leave dialog.
 */
export default function ModalUnsavedGuard({ open, isDirty, onSave, onClose, autosave = false }: Props) {
  const { requestLeaveConfirmation } = useUnsavedChangesGuard();

  if (!open) return null;

  return (
    <UnsavedChangesSyncGuard
      isDirty={isDirty}
      onSave={onSave}
      autosave={autosave}
      enabled={open}
    />
  );
}

export function useGuardedModalClose(isDirty: boolean, onClose: () => void) {
  const { requestLeaveConfirmation, isBlocking } = useUnsavedChangesGuard();

  return () => {
    if (isDirty || isBlocking) {
      requestLeaveConfirmation({ type: 'callback', fn: onClose });
      return;
    }
    onClose();
  };
}
