'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

type IntakeInstanceContextValue = {
  intakeData: IntakeData;
  setIntakeData: React.Dispatch<React.SetStateAction<IntakeData>>;
  replaceIntakeData: (next: unknown, options?: { markDirty?: boolean }) => void;
  updateSection: <K extends keyof IntakeData>(section: K, value: IntakeData[K]) => void;
  updateField: (section: keyof IntakeData, field: string, value: unknown) => void;
  isDirty: boolean;
  markDirty: () => void;
  markSaved: () => void;
  validatedAt: string | null;
  setValidatedAt: (v: string | null) => void;
};

const IntakeInstanceCtx = createContext<IntakeInstanceContextValue | undefined>(undefined);

export function IntakeInstanceProvider({
  children,
  initialData,
  initialValidatedAt,
}: {
  children: ReactNode;
  initialData?: unknown;
  initialValidatedAt?: string | null;
}) {
  const [intakeData, setIntakeData] = useState<IntakeData>(() =>
    ensureIntakeShape(initialData ?? {})
  );
  const [isDirty, setIsDirty] = useState(false);
  const [validatedAt, setValidatedAt] = useState<string | null>(initialValidatedAt ?? null);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markSaved = useCallback(() => setIsDirty(false), []);

  const replaceIntakeData = useCallback((next: unknown, options?: { markDirty?: boolean }) => {
    setIntakeData(ensureIntakeShape(next));
    if (options?.markDirty !== false) setIsDirty(true);
  }, []);

  const updateSection = useCallback(
    <K extends keyof IntakeData>(section: K, value: IntakeData[K]) => {
      setIntakeData((prev) => ({ ...prev, [section]: value }));
      setIsDirty(true);
      setValidatedAt(null);
    },
    []
  );

  const updateField = useCallback((section: keyof IntakeData, field: string, value: unknown) => {
    setIntakeData((prev) => {
      const current = prev[section];
      if (!current || typeof current !== 'object') return prev;
      return {
        ...prev,
        [section]: { ...(current as object), [field]: value },
      } as IntakeData;
    });
    setIsDirty(true);
    setValidatedAt(null);
  }, []);

  const value = useMemo(
    () => ({
      intakeData,
      setIntakeData,
      replaceIntakeData,
      updateSection,
      updateField,
      isDirty,
      markDirty,
      markSaved,
      validatedAt,
      setValidatedAt,
    }),
    [
      intakeData,
      replaceIntakeData,
      updateSection,
      updateField,
      isDirty,
      markDirty,
      markSaved,
      validatedAt,
    ]
  );

  return <IntakeInstanceCtx.Provider value={value}>{children}</IntakeInstanceCtx.Provider>;
}

export function useIntakeInstance() {
  const ctx = useContext(IntakeInstanceCtx);
  if (!ctx) throw new Error('useIntakeInstance must be used within IntakeInstanceProvider');
  return ctx;
}
