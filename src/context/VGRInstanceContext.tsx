'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type VGRInstanceSectionKey = 'bijlage2' | 'bijlage3';

export type VGRInstanceData = Record<string, any>;

type SaveHandler = () => Promise<void>;

type VGRInstanceContextValue = {
  vgrData: VGRInstanceData;
  setVGRData: React.Dispatch<React.SetStateAction<VGRInstanceData>>;
  replaceVGRData: (next: VGRInstanceData, options?: { markDirty?: boolean }) => void;
  updateField: (field: string, value: any) => void;
  isDirty: boolean;
  markDirty: () => void;
  markSaved: () => void;
  registerSaveHandler: (sectionKey: VGRInstanceSectionKey, handler: SaveHandler) => void;
  unregisterSaveHandler: (sectionKey: VGRInstanceSectionKey) => void;
  saveAll: () => Promise<void>;
};

const SECTION_SAVE_ORDER: VGRInstanceSectionKey[] = ['bijlage2', 'bijlage3'];

const VGRInstanceCtx = createContext<VGRInstanceContextValue | undefined>(undefined);

export function VGRInstanceProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: VGRInstanceData;
}) {
  const [vgrData, setVGRData] = useState<VGRInstanceData>(initialData ?? {});
  const [isDirty, setIsDirty] = useState(false);
  const handlersRef = useRef<Partial<Record<VGRInstanceSectionKey, SaveHandler>>>({});

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const replaceVGRData = useCallback(
    (next: VGRInstanceData, options?: { markDirty?: boolean }) => {
      setVGRData(next);
      if (options?.markDirty !== false) {
        setIsDirty(true);
      }
    },
    []
  );

  const updateField = useCallback((field: string, value: any) => {
    setVGRData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const markSaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  const registerSaveHandler = useCallback((sectionKey: VGRInstanceSectionKey, handler: SaveHandler) => {
    handlersRef.current[sectionKey] = handler;
  }, []);

  const unregisterSaveHandler = useCallback((sectionKey: VGRInstanceSectionKey) => {
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
      vgrData,
      setVGRData,
      replaceVGRData,
      updateField,
      isDirty,
      markDirty,
      markSaved,
      registerSaveHandler,
      unregisterSaveHandler,
      saveAll,
    }),
    [
      vgrData,
      isDirty,
      replaceVGRData,
      updateField,
      markDirty,
      markSaved,
      registerSaveHandler,
      unregisterSaveHandler,
      saveAll,
    ]
  );

  return <VGRInstanceCtx.Provider value={value}>{children}</VGRInstanceCtx.Provider>;
}

export function useVGRInstance() {
  const ctx = useContext(VGRInstanceCtx);
  if (!ctx) throw new Error('useVGRInstance must be used within VGRInstanceProvider');
  return ctx;
}
