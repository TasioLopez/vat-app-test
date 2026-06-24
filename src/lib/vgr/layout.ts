export const VGR_LAYOUT_KEYS = ['vgr'] as const;

export type VGRLayoutKey = (typeof VGR_LAYOUT_KEYS)[number];

export function isVGRLayoutKey(value: string | null | undefined): value is VGRLayoutKey {
  return !!value && (VGR_LAYOUT_KEYS as readonly string[]).includes(value);
}

export function getVGRLayoutLabel(layoutKey: VGRLayoutKey | null | undefined): string {
  if (layoutKey === 'vgr') return 'VGR';
  return 'VGR';
}
