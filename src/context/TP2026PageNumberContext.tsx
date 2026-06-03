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
  getDefaultTP2026PageCounts,
  getPageNumber as computePageNumber,
  getSectionStartPage as computeSectionStartPage,
  type TP2026SectionId,
  type TP2026SectionPageCounts,
} from '@/lib/tp2026/page-numbering';

type TP2026PageNumberContextValue = {
  sectionPageCounts: TP2026SectionPageCounts;
  setSectionPageCount: (sectionId: TP2026SectionId, count: number) => void;
  getSectionStartPage: (sectionId: TP2026SectionId) => number;
  getPageNumber: (sectionId: TP2026SectionId, localIndex: number) => number;
};

const TP2026PageNumberContext = createContext<TP2026PageNumberContextValue | undefined>(
  undefined
);

export function TP2026PageNumberProvider({ children }: { children: ReactNode }) {
  const [sectionPageCounts, setSectionPageCounts] = useState<TP2026SectionPageCounts>(
    getDefaultTP2026PageCounts
  );

  const setSectionPageCount = useCallback((sectionId: TP2026SectionId, count: number) => {
    const safe = Math.max(0, Math.floor(count));
    setSectionPageCounts((prev) => {
      if (prev[sectionId] === safe) return prev;
      return { ...prev, [sectionId]: safe };
    });
  }, []);

  const getSectionStartPage = useCallback(
    (sectionId: TP2026SectionId) => computeSectionStartPage(sectionId, sectionPageCounts),
    [sectionPageCounts]
  );

  const getPageNumber = useCallback(
    (sectionId: TP2026SectionId, localIndex: number) =>
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
    <TP2026PageNumberContext.Provider value={value}>{children}</TP2026PageNumberContext.Provider>
  );
}

export function useTP2026PageNumber(): TP2026PageNumberContextValue {
  const ctx = useContext(TP2026PageNumberContext);
  if (!ctx) {
    throw new Error('useTP2026PageNumber must be used within TP2026PageNumberProvider');
  }
  return ctx;
}

/** Safe when provider is optional (e.g. tests); returns null outside provider. */
export function useTP2026PageNumberOptional(): TP2026PageNumberContextValue | null {
  return useContext(TP2026PageNumberContext) ?? null;
}
