import type { CvLocale, CvSectionLayout, CvSectionType, CvSidebarPosition } from '@/types/cv';
import { SECTION_REGISTRY } from '@/lib/cv/section-registry';
import { uiLabel } from '@/lib/cv/section-labels';

export const ROW_LAYOUT_OPTIONS: CvSectionLayout[] = ['full', 'half'];

export const ADD_LAYOUT_OPTIONS: CvSectionLayout[] = ['full', 'half', 'sidebar', 'main'];

export function layoutOptionLabel(
  layout: CvSectionLayout,
  locale: CvLocale
): string {
  const labels = (key: string) => uiLabel(locale, key);
  switch (layout) {
    case 'full':
      return labels('layoutFull');
    case 'half':
      return labels('layoutHalf');
    case 'sidebar':
      return labels('layoutSidebar');
    case 'main':
      return labels('layoutMain');
    default:
      return layout;
  }
}

export function getLayoutChoicesForSection(type: CvSectionType): CvSectionLayout[] {
  const allowed = SECTION_REGISTRY[type]?.allowedLayouts ?? ['full'];
  return ROW_LAYOUT_OPTIONS.filter((l) => allowed.includes(l));
}

export function getDefaultAddLayoutForColumn(
  columnHint: 'sidebar' | 'main' | 'root'
): CvSectionLayout {
  if (columnHint === 'sidebar') return 'sidebar';
  if (columnHint === 'main') return 'main';
  return 'full';
}

/** Derive sidebar side from horizontal column order after drag. */
export function sidebarPositionFromColumnOrder(
  orderedIds: string[],
  sidebarId: string,
  mainId: string
): CvSidebarPosition {
  const sidebarIndex = orderedIds.indexOf(sidebarId);
  const mainIndex = orderedIds.indexOf(mainId);
  if (sidebarIndex < 0 || mainIndex < 0) return 'left';
  return sidebarIndex < mainIndex ? 'left' : 'right';
}
