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
import { ensureVGRShape } from '@/lib/vgr/mapping';
import type { VGRBody, VGRData, VGRMeta } from '@/lib/vgr/schema';

export type VGRInstanceSectionKey =
  | 'setup'
  | 'cover'
  | 'gegevens'
  | 'body'
  | 'planning'
  | 'applications'
  | 'review';

export type VGRInstanceData = VGRData;

type SaveHandler = () => Promise<void>;

type BodyPatch = {
  [K in keyof VGRBody]?: Partial<VGRBody[K]>;
};

type VGRInstanceContextValue = {
  vgrData: VGRInstanceData;
  setVGRData: React.Dispatch<React.SetStateAction<VGRInstanceData>>;
  replaceVGRData: (next: Record<string, any>, options?: { markDirty?: boolean }) => void;
  /** Flat (gegevens / cover) field update. */
  updateField: (field: string, value: any) => void;
  /** Shallow patch on `vgr_meta`. */
  updateMeta: (patch: Partial<VGRMeta>) => void;
  /** Patch one body section: `updateBody('zoekprofiel', { tekst })`. */
  updateBody: <K extends keyof VGRBody>(section: K, patch: Partial<VGRBody[K]>) => void;
  /** Replace one body section entirely. */
  setBodySection: <K extends keyof VGRBody>(section: K, value: VGRBody[K]) => void;
  /** Patch several body sections at once (AI "Overnemen"). */
  patchBody: (patch: BodyPatch) => void;
  isDirty: boolean;
  markDirty: () => void;
  markSaved: () => void;
  registerSaveHandler: (sectionKey: VGRInstanceSectionKey, handler: SaveHandler) => void;
  unregisterSaveHandler: (sectionKey: VGRInstanceSectionKey) => void;
  saveAll: () => Promise<void>;
};

const SECTION_SAVE_ORDER: VGRInstanceSectionKey[] = [
  'setup',
  'cover',
  'gegevens',
  'body',
  'planning',
  'applications',
  'review',
];

const VGRInstanceCtx = createContext<VGRInstanceContextValue | undefined>(undefined);

export function VGRInstanceProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: Record<string, any>;
}) {
  const [vgrData, setVGRData] = useState<VGRInstanceData>(() => ensureVGRShape(initialData ?? {}));
  const [isDirty, setIsDirty] = useState(false);
  const handlersRef = useRef<Partial<Record<VGRInstanceSectionKey, SaveHandler>>>({});

  const markDirty = useCallback(() => setIsDirty(true), []);

  const replaceVGRData = useCallback((next: Record<string, any>, options?: { markDirty?: boolean }) => {
    setVGRData(ensureVGRShape(next));
    if (options?.markDirty !== false) setIsDirty(true);
  }, []);

  const updateField = useCallback((field: string, value: any) => {
    setVGRData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const updateMeta = useCallback((patch: Partial<VGRMeta>) => {
    setVGRData((prev) => ({ ...prev, vgr_meta: { ...prev.vgr_meta, ...patch } }));
    setIsDirty(true);
  }, []);

  const updateBody = useCallback(<K extends keyof VGRBody>(section: K, patch: Partial<VGRBody[K]>) => {
    setVGRData((prev) => ({
      ...prev,
      body: { ...prev.body, [section]: { ...(prev.body[section] as object), ...(patch as object) } },
    }));
    setIsDirty(true);
  }, []);

  const setBodySection = useCallback(<K extends keyof VGRBody>(section: K, value: VGRBody[K]) => {
    setVGRData((prev) => ({ ...prev, body: { ...prev.body, [section]: value } }));
    setIsDirty(true);
  }, []);

  const patchBody = useCallback((patch: BodyPatch) => {
    setVGRData((prev) => {
      const body = { ...prev.body } as VGRBody;
      for (const [k, v] of Object.entries(patch)) {
        if (!v) continue;
        const key = k as keyof VGRBody;
        (body as Record<string, unknown>)[key] = { ...(body[key] as object), ...(v as object) };
      }
      return { ...prev, body };
    });
    setIsDirty(true);
  }, []);

  const markSaved = useCallback(() => setIsDirty(false), []);

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
      updateMeta,
      updateBody,
      setBodySection,
      patchBody,
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
      updateMeta,
      updateBody,
      setBodySection,
      patchBody,
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
