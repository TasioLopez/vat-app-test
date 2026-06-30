'use client';

import React, { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const TEXTAREA_CLASS =
  'w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PREVIEW_CONTAINER_CLASS =
  'rounded-md border border-[#b8985c]/40 bg-muted/30 px-3 py-2';

type Props = {
  value: string;
  onChange: (value: string) => void;
  renderPreview: (value: string) => React.ReactNode;
  label?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  placeholder?: string;
  rows?: number;
  emptyHint?: string;
};

export function ConfirmToEditBlock({
  value,
  onChange,
  renderPreview,
  label,
  confirmTitle = 'Geëxtraheerd citaat bewerken?',
  confirmDescription = 'Dit tekstblok is automatisch overgenomen uit het bronrapport. Controleer wijzigingen zorgvuldig voordat u het document exporteert.',
  placeholder = 'Letterlijk citaat uit het bronrapport…',
  rows = 6,
  emptyHint = 'Klik om te bewerken',
}: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setUnlocked(true);
    setConfirmOpen(false);
  };

  if (unlocked) {
    return (
      <div>
        {label ? (
          <label className="mb-1 block text-xs font-medium text-[#64b6a6]">{label}</label>
        ) : null}
        <textarea
          className={TEXTAREA_CLASS}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <>
      <div>
        {label ? (
          <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        ) : null}
        <button
          type="button"
          className={`group relative w-full cursor-pointer text-left transition-colors hover:bg-muted/50 ${PREVIEW_CONTAINER_CLASS}`}
          onClick={() => setConfirmOpen(true)}
        >
          <div className="text-sm leading-relaxed text-neutral-900">
            {value.trim() ? renderPreview(value) : (
              <span className="italic text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <span className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {emptyHint}
          </span>
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="Bewerken"
        onConfirm={handleConfirm}
      />
    </>
  );
}

export { TEXTAREA_CLASS, PREVIEW_CONTAINER_CLASS };
