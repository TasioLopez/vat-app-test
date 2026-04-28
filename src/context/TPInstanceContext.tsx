'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type TPInstanceSectionKey =
  | 'cover2026'
  | 'gegevens2026'
  | 'basis2026'
  | 'bijlage12026'
  | 'bijlage22026'
  | 'bijlage32026';

export type TPInstanceData = Record<string, any>;

type SaveHandler = () => Promise<void>;

type TPInstanceContextValue = {
  tpData: TPInstanceData;
  setTPData: React.Dispatch<React.SetStateAction<TPInstanceData>>;
  updateField: (field: string, value: any) => void;
  isDirty: boolean;
  markSaved: () => void;
  registerSaveHandler: (sectionKey: TPInstanceSectionKey, handler: SaveHandler) => void;
  unregisterSaveHandler: (sectionKey: TPInstanceSectionKey) => void;
  saveAll: () => Promise<void>;
};

const SECTION_SAVE_ORDER: TPInstanceSectionKey[] = [
  'cover2026',
  'gegevens2026',
  'basis2026',
  'bijlage12026',
  'bijlage22026',
  'bijlage32026',
];

const TPInstanceCtx = createContext<TPInstanceContextValue | undefined>(undefined);

export function TPInstanceProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: TPInstanceData;
}) {
  const [tpData, setTPData] = useState<TPInstanceData>(initialData ?? {});
  const [isDirty, setIsDirty] = useState(false);
  const handlersRef = useRef<Partial<Record<TPInstanceSectionKey, SaveHandler>>>({});

  const updateField = useCallback((field: string, value: any) => {
    setTPData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const markSaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  const registerSaveHandler = useCallback((sectionKey: TPInstanceSectionKey, handler: SaveHandler) => {
    handlersRef.current[sectionKey] = handler;
  }, []);

  const unregisterSaveHandler = useCallback((sectionKey: TPInstanceSectionKey) => {
    delete handlersRef.current[sectionKey];
  }, []);

  const saveAll = useCallback(async () => {
    for (const sectionKey of SECTION_SAVE_ORDER) {
      const handler = handlersRef.current[sectionKey];
      if (handler) await handler();
    }
    setIsDirty(false);
  }, []);

  const value = useMemo(
    () => ({
      tpData,
      setTPData,
      updateField,
      isDirty,
      markSaved,
      registerSaveHandler,
      unregisterSaveHandler,
      saveAll,
    }),
    [tpData, isDirty, updateField, markSaved, registerSaveHandler, unregisterSaveHandler, saveAll]
  );

  return <TPInstanceCtx.Provider value={value}>{children}</TPInstanceCtx.Provider>;
}

export function useTPInstance() {
  const ctx = useContext(TPInstanceCtx);
  if (!ctx) throw new Error('useTPInstance must be used within TPInstanceProvider');
  return ctx;
}
