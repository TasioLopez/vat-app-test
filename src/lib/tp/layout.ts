/** Valid `tp_instances.layout_key` values (DB may still contain legacy rows). */
export const TP_LAYOUT_KEYS = ['tp_legacy', 'tp_2026'] as const;

export type TPLayoutKey = (typeof TP_LAYOUT_KEYS)[number];

export function isTPLayoutKey(value: string | null | undefined): value is TPLayoutKey {
  return !!value && (TP_LAYOUT_KEYS as readonly string[]).includes(value);
}

export function getTPLayoutLabel(layoutKey: TPLayoutKey | null | undefined): string {
  if (layoutKey === 'tp_2026') return 'Trajectplan';
  if (layoutKey === 'tp_legacy') return 'Trajectplan (oud)';
  return 'Trajectplan';
}
