/**
 * Shared surface for text inputs and selects so padding/border/focus stay aligned.
 * Matches the Input component: purple borders, focus ring, hover, disabled.
 */

export const CONTROL_SURFACE_CLASS =
  "h-10 w-full min-w-0 rounded-lg border-2 border-purple-200 bg-white px-4 py-2 text-sm shadow-sm transition-all duration-200 outline-none hover:border-purple-300 focus-visible:border-purple-500 focus-visible:ring-[3px] focus-visible:ring-purple-500/50 focus-visible:shadow-md focus-visible:shadow-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50";

/** Native <select> / Radix SelectTrigger */
export const SELECT_CLASS = `flex ${CONTROL_SURFACE_CLASS}`;

/** Text <input> (and single-line fields that should match selects) */
export const INPUT_CLASS = CONTROL_SURFACE_CLASS;
