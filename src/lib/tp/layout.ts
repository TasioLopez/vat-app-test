export const TP_LAYOUT_KEYS = ['tp_legacy', 'tp_2026'] as const;

export type TPLayoutKey = (typeof TP_LAYOUT_KEYS)[number];

export function isTPLayoutKey(value: string | null | undefined): value is TPLayoutKey {
  return !!value && (TP_LAYOUT_KEYS as readonly string[]).includes(value);
}

export function getTPLayoutLabel(layoutKey: TPLayoutKey | null | undefined): string {
  if (layoutKey === 'tp_2026') return 'TP 2026';
  return 'TP (huidig)';
}
