/** Shared layout tokens for TP 2026 basis document (part 3) body sections. */

export const TP_BASIS_BODY_BOX_CLASS = 'bg-[#f3efe4] p-2.5 text-neutral-900';

export const TP_BASIS_TOELICHTING_CLASS =
  'mb-1.5 text-[12px] font-bold leading-tight text-[#64b6a6]';

export const TP_BASIS_TOELICHTING_DEFAULT = 'Toelichting';

export const TP_BASIS_TOELICHTING_POW = 'Toelichting POW-meter™';

/** Field keys that get an in-box Toelichting heading (inleiding handled separately). */
export const TP_BASIS_TOELICHTING_TEXT_KEYS = new Set([
  'soc',
  'visw',
  'prof',
  'blem',
  'vlb',
  'zp',
]);

export function getBasisToelichtingLabel(key: string): string | null {
  if (key === 'plaats') return TP_BASIS_TOELICHTING_POW;
  if (TP_BASIS_TOELICHTING_TEXT_KEYS.has(key)) return TP_BASIS_TOELICHTING_DEFAULT;
  return null;
}
