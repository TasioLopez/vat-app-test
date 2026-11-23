'use client';

import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUIET_BUTTON_CLASS } from '@/components/employee/detail/shared';

type Props = {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

/** Save and cancel for edit mode; sticks to the bottom of the scrolling page. */
export function EditBar({ dirty, saving, onCancel, onSave }: Props) {
  return (
    <div className="sticky bottom-0 z-30 mt-auto border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
        <p className="inline-flex items-center gap-2 text-[13px] text-gray-600" role="status">
          {dirty ? (
            <>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-purple-600" />
              Niet-opgeslagen wijzigingen
            </>
          ) : (
            'Geen wijzigingen'
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={QUIET_BUTTON_CLASS}
            onClick={onCancel}
            disabled={saving}
          >
            Annuleren
          </Button>
          <Button
            type="button"
            className="h-9 gap-2 px-4"
            onClick={onSave}
            disabled={saving}
            aria-busy={saving}
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? 'Opslaan…' : 'Opslaan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
