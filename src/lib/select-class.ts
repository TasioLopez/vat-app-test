/**
 * Shared surface for text inputs and selects so padding/border/focus stay aligned.
 */

export const CONTROL_SURFACE_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-none transition-colors duration-150 outline-none hover:border-gray-300 focus-visible:border-[var(--color-primary-500)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-primary-500)]/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50";

/** Native <select> / Radix SelectTrigger */
export const SELECT_CLASS = `flex ${CONTROL_SURFACE_CLASS}`;

/** Text <input> (and single-line fields that should match selects) */
export const INPUT_CLASS = CONTROL_SURFACE_CLASS;
