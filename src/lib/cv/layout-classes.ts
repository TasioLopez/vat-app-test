import type { CvSectionLayout } from '@/types/cv';

/** Tailwind width classes for leaf section layout within a column. */
export function sectionLayoutClass(layout: CvSectionLayout): string {
  switch (layout) {
    case 'half':
      return 'w-1/2 shrink-0 px-1';
    case 'full':
    case 'sidebar':
    case 'main':
    default:
      return 'w-full';
  }
}

/** Short badge for structure panel rows. */
export function sectionLayoutBadge(layout: CvSectionLayout): string {
  switch (layout) {
    case 'half':
      return '½';
    case 'sidebar':
      return 'Z';
    case 'main':
      return 'H';
    case 'grid_3':
      return '3';
    case 'full':
    default:
      return 'Vol';
  }
}
