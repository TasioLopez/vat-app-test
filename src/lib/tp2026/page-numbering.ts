/** Document section order for TP2026 continuous footer numbering. */
export const TP2026_SECTION_ORDER = [
  'cover',
  'gegevens',
  'basis',
  'bijlage1',
  'bijlage2',
  'bijlage3',
] as const;

export type TP2026SectionId = (typeof TP2026_SECTION_ORDER)[number];

export type TP2026SectionPageCounts = Record<TP2026SectionId, number>;

export const COVER_PAGE_COUNT = 1;
export const GEGEVENS_PAGE_COUNT = 3;
export const BIJLAGE1_PAGE_COUNT = 1;

export function getDefaultTP2026PageCounts(): TP2026SectionPageCounts {
  return {
    cover: COVER_PAGE_COUNT,
    gegevens: GEGEVENS_PAGE_COUNT,
    basis: 0,
    bijlage1: BIJLAGE1_PAGE_COUNT,
    bijlage2: 0,
    bijlage3: 0,
  };
}

/**
 * First footer page number for a section (legacy TP getPageOffset semantics).
 * Cover is page 1; Gegevens starts at 2 when cover count is 1.
 */
export function getSectionStartPage(
  sectionId: TP2026SectionId,
  counts: TP2026SectionPageCounts
): number {
  const currentIndex = TP2026_SECTION_ORDER.indexOf(sectionId);
  if (currentIndex < 0) return 1;

  let offset = 1;
  for (let i = 0; i < currentIndex; i++) {
    offset += counts[TP2026_SECTION_ORDER[i]] || 0;
  }
  return offset;
}

export function getPageNumber(
  sectionId: TP2026SectionId,
  localIndex: number,
  counts: TP2026SectionPageCounts
): number {
  return getSectionStartPage(sectionId, counts) + localIndex;
}
