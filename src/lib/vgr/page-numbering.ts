/** Document section order for VGR continuous footer numbering (01 → 05). */
export const VGR_SECTION_ORDER = ['cover', 'gegevens', 'body', 'planning', 'applications'] as const;

export type VGRSectionId = (typeof VGR_SECTION_ORDER)[number];

export type VGRSectionPageCounts = Record<VGRSectionId, number>;

/** Cover is never numbered; numbering starts at 1 on the first Gegevens page (matches Word). */
export const VGR_COVER_PAGE_COUNT = 1;

export function getDefaultVGRPageCounts(): VGRSectionPageCounts {
  return {
    cover: VGR_COVER_PAGE_COUNT,
    gegevens: 2,
    body: 0,
    planning: 1,
    applications: 1,
  };
}

/** First page number (1-based, cover excluded) of a section. */
export function getSectionStartPage(sectionId: VGRSectionId, counts: VGRSectionPageCounts): number {
  const currentIndex = VGR_SECTION_ORDER.indexOf(sectionId);
  if (currentIndex < 0) return 1;

  let offset = 1;
  for (let i = 0; i < currentIndex; i++) {
    const id = VGR_SECTION_ORDER[i];
    if (id === 'cover') continue;
    offset += counts[id] || 0;
  }
  return offset;
}

export function getPageNumber(
  sectionId: VGRSectionId,
  localIndex: number,
  counts: VGRSectionPageCounts
): number {
  return getSectionStartPage(sectionId, counts) + localIndex;
}
