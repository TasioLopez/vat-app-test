'use client';

import { FieldValidateButton } from '@/components/employee/FieldValidateButton';

/** One surface for every card on the werknemer page: hairline border, no shadow. */
export const CARD_CLASS = 'rounded-xl border border-gray-200 bg-white';

export const CARD_TITLE_CLASS = 'text-[15px] font-semibold leading-6 text-gray-900';

export const SECTION_LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-wider text-gray-500';

/** Neutral secondary button, applied on top of `<Button variant="outline">`. */
export const QUIET_BUTTON_CLASS =
  'h-9 gap-2 border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-none hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow-none';

const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** "12 nov", with the year added when it is not the current one. */
export function formatShortDate(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const base = `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

type ReviewSlotProps = {
  label: string;
  onValidate: () => void;
  disabled?: boolean;
};

/**
 * Marks a fact that still needs a check. Shows an amber dot; hovering or focusing the
 * surrounding `group/fact` swaps it for the validate button. Touch screens always get the button.
 */
export function ReviewSlot({ label, onValidate, disabled = false }: ReviewSlotProps) {
  return (
    <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-amber-500 transition-opacity group-hover/fact:opacity-0 group-focus-within/fact:opacity-0 [@media(hover:none)]:opacity-0"
      />
      <FieldValidateButton
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onValidate();
        }}
        disabled={disabled}
        label={label}
        size="sm"
        className="absolute inset-0 h-6 w-6 opacity-0 transition-opacity group-hover/fact:opacity-100 group-focus-within/fact:opacity-100 [@media(hover:none)]:opacity-100"
      />
    </span>
  );
}
