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

export type TPData = TPDataType;

type TPContextValue = {
  tpData: TPData;
  setTPData: React.Dispatch<React.SetStateAction<TPData>>;
  /** Back-compat for existing Edit components */
  updateField: (field: string, value: any) => void;
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

  const updateField = useCallback((field: string, value: any) => {
    setTPData((prev) => ({ ...(prev as any), [field]: value }));
  }, []);

  const value = useMemo(
    () => ({ tpData, setTPData, updateField }),
    [tpData, updateField]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTP() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTP must be used within TPProvider');
  return ctx;
}
