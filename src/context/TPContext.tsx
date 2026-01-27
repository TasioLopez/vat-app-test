'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { TPData as TPDataType } from '@/lib/tp/load'; // type-only import
import type { SectionKey } from '@/components/tp/sections/registry';

export type TPData = TPDataType;

type SectionPageCounts = {
  cover: number;
  empinfo: number;
  part3: number;
  bijlage: number;
};

type TPContextValue = {
  tpData: TPData;
  setTPData: React.Dispatch<React.SetStateAction<TPData>>;
  /** Back-compat for existing Edit components */
  updateField: (field: string, value: any) => void;
  /** Page count tracking for continuous numbering */
  sectionPageCounts: SectionPageCounts;
  setSectionPageCount: (sectionKey: SectionKey, count: number) => void;
  getPageOffset: (sectionKey: SectionKey) => number;
};

const Ctx = createContext<TPContextValue | undefined>(undefined);

export function TPProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  /** Seed context (used by printable client) */
  initialData?: TPData;
}) {
  const [tpData, setTPData] = useState<TPData>(initialData ?? ({} as TPData));
  const [sectionPageCounts, setSectionPageCounts] = useState<SectionPageCounts>({
    cover: 1, // Cover page is always 1 page
    empinfo: 0,
    part3: 0,
    bijlage: 0,
  });

  const updateField = useCallback((field: string, value: any) => {
    setTPData((prev) => ({ ...(prev as any), [field]: value }));
  }, []);

  const setSectionPageCount = useCallback((sectionKey: SectionKey, count: number) => {
    setSectionPageCounts((prev) => ({
      ...prev,
      [sectionKey]: count,
    }));
  }, []);

  const getPageOffset = useCallback((sectionKey: SectionKey): number => {
    const order: SectionKey[] = ['cover', 'empinfo', 'part3', 'bijlage'];
    const currentIndex = order.indexOf(sectionKey);
    let offset = 1; // Cover page is always page 1
    for (let i = 0; i < currentIndex; i++) {
      offset += sectionPageCounts[order[i]] || 0;
    }
    return offset;
  }, [sectionPageCounts]);

  const value = useMemo(
    () => ({ 
      tpData, 
      setTPData, 
      updateField,
      sectionPageCounts,
      setSectionPageCount,
      getPageOffset,
    }),
    [tpData, updateField, sectionPageCounts, setSectionPageCount, getPageOffset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTP() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTP must be used within TPProvider');
  return ctx;
}
