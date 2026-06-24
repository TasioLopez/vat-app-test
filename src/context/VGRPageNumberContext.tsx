'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getDefaultVGRPageCounts,
  getPageNumber as computePageNumber,
  getSectionStartPage as computeSectionStartPage,
  type VGRSectionId,
  type VGRSectionPageCounts,
} from '@/lib/vgr/page-numbering';

type VGRPageNumberContextValue = {
  sectionPageCounts: VGRSectionPageCounts;
  setSectionPageCount: (sectionId: VGRSectionId, count: number) => void;
  getSectionStartPage: (sectionId: VGRSectionId) => number;
  getPageNumber: (sectionId: VGRSectionId, localIndex: number) => number;
};

const VGRPageNumberContext = createContext<VGRPageNumberContextValue | undefined>(undefined);

export function VGRPageNumberProvider({ children }: { children: ReactNode }) {
  const [sectionPageCounts, setSectionPageCounts] = useState<VGRSectionPageCounts>(
    getDefaultVGRPageCounts
  );

  const setSectionPageCount = useCallback((sectionId: VGRSectionId, count: number) => {
    const safe = Math.max(0, Math.floor(count));
    setSectionPageCounts((prev) => {
      if (prev[sectionId] === safe) return prev;
      return { ...prev, [sectionId]: safe };
    });
  }, []);

  const getSectionStartPage = useCallback(
    (sectionId: VGRSectionId) => computeSectionStartPage(sectionId, sectionPageCounts),
    [sectionPageCounts]
  );

  const getPageNumber = useCallback(
    (sectionId: VGRSectionId, localIndex: number) =>
      computePageNumber(sectionId, localIndex, sectionPageCounts),
    [sectionPageCounts]
  );

  const value = useMemo(
    () => ({
      sectionPageCounts,
      setSectionPageCount,
      getSectionStartPage,
      getPageNumber,
    }),
    [sectionPageCounts, setSectionPageCount, getSectionStartPage, getPageNumber]
  );

  return (
    <VGRPageNumberContext.Provider value={value}>{children}</VGRPageNumberContext.Provider>
  );
}

export function useVGRPageNumber(): VGRPageNumberContextValue {
  const ctx = useContext(VGRPageNumberContext);
  if (!ctx) {
    throw new Error('useVGRPageNumber must be used within VGRPageNumberProvider');
  }
  return ctx;
}

export function useVGRPageNumberOptional(): VGRPageNumberContextValue | null {
  return useContext(VGRPageNumberContext) ?? null;
}
