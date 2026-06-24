/** Document section order for VGR continuous footer numbering. */
export const VGR_SECTION_ORDER = ['bijlage2', 'bijlage3'] as const;

export type VGRSectionId = (typeof VGR_SECTION_ORDER)[number];

export type VGRSectionPageCounts = Record<VGRSectionId, number>;

export function getDefaultVGRPageCounts(): VGRSectionPageCounts {
  return {
    bijlage2: 0,
    bijlage3: 0,
  };
}

export function getSectionStartPage(
  sectionId: VGRSectionId,
  counts: VGRSectionPageCounts
): number {
  const currentIndex = VGR_SECTION_ORDER.indexOf(sectionId);
  if (currentIndex < 0) return 1;

  let offset = 1;
  for (let i = 0; i < currentIndex; i++) {
    offset += counts[VGR_SECTION_ORDER[i]] || 0;
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
