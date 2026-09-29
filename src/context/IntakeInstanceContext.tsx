'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ensureIntakeShape, type IntakeData } from '@/lib/intake/schema';

type HistoryOpts = { debounce?: boolean };

type ReplaceOptions = {
  markDirty?: boolean;
  /** Skip recording history (used by undo/redo). */
  skipHistory?: boolean;
  /** Record history with debounce for typing bursts. */
  debounce?: boolean;
};

type IntakeInstanceContextValue = {
  intakeData: IntakeData;
  setIntakeData: React.Dispatch<React.SetStateAction<IntakeData>>;
  replaceIntakeData: (next: unknown, options?: ReplaceOptions) => void;
  updateSection: <K extends keyof IntakeData>(
    section: K,
    value: IntakeData[K],
    opts?: HistoryOpts
  ) => void;
  updateField: (
    section: keyof IntakeData,
    field: string,
    value: unknown,
    opts?: HistoryOpts
  ) => void;
  isDirty: boolean;
  markDirty: () => void;
  markSaved: () => void;
  validatedAt: string | null;
  setValidatedAt: (v: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const IntakeInstanceCtx = createContext<IntakeInstanceContextValue | undefined>(undefined);

const HISTORY_LIMIT = 50;

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
  const [histVer, setHistVer] = useState(0);

  const stateRef = useRef(intakeData);
  const pastRef = useRef<IntakeData[]>([]);
  const futureRef = useRef<IntakeData[]>([]);
  const skipHistoryRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstOpenRef = useRef(false);

  useEffect(() => {
    stateRef.current = intakeData;
  }, [intakeData]);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markSaved = useCallback(() => setIsDirty(false), []);

  const recordHistory = useCallback((opts?: HistoryOpts) => {
    if (skipHistoryRef.current) return;

    const push = () => {
      pastRef.current.push(structuredClone(stateRef.current));
      if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
      futureRef.current = [];
      setHistVer((v) => v + 1);
    };

    if (opts?.debounce) {
      if (!burstOpenRef.current) {
        push();
        burstOpenRef.current = true;
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        burstOpenRef.current = false;
        debounceTimerRef.current = null;
      }, 350);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      burstOpenRef.current = false;
    }
    push();
  }, []);

  const replaceIntakeData = useCallback(
    (next: unknown, options?: ReplaceOptions) => {
      if (!options?.skipHistory) {
        recordHistory(options?.debounce ? { debounce: true } : undefined);
      }
      setIntakeData(ensureIntakeShape(next));
      if (options?.markDirty !== false) {
        setIsDirty(true);
        setValidatedAt(null);
      }
    },
    [recordHistory]
  );

  const updateSection = useCallback(
    <K extends keyof IntakeData>(section: K, value: IntakeData[K], opts?: HistoryOpts) => {
      recordHistory(opts);
      setIntakeData((prev) => ({ ...prev, [section]: value }));
      setIsDirty(true);
      setValidatedAt(null);
    },
    [recordHistory]
  );

  const updateField = useCallback(
    (section: keyof IntakeData, field: string, value: unknown, opts?: HistoryOpts) => {
      recordHistory(opts);
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
    },
    [recordHistory]
  );

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(structuredClone(stateRef.current));
    skipHistoryRef.current = true;
    setIntakeData(prev);
    stateRef.current = prev;
    setIsDirty(true);
    setValidatedAt(null);
    skipHistoryRef.current = false;
    setHistVer((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(structuredClone(stateRef.current));
    skipHistoryRef.current = true;
    setIntakeData(next);
    stateRef.current = next;
    setIsDirty(true);
    setValidatedAt(null);
    skipHistoryRef.current = false;
    setHistVer((v) => v + 1);
  }, []);

  const canUndo = histVer >= 0 && pastRef.current.length > 0;
  const canRedo = histVer >= 0 && futureRef.current.length > 0;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="dialog"]')) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

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
      undo,
      redo,
      canUndo,
      canRedo,
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
      undo,
      redo,
      canUndo,
      canRedo,
    ]
  );

  return <IntakeInstanceCtx.Provider value={value}>{children}</IntakeInstanceCtx.Provider>;
}

export function useIntakeInstance() {
  const ctx = useContext(IntakeInstanceCtx);
  if (!ctx) throw new Error('useIntakeInstance must be used within IntakeInstanceProvider');
  return ctx;
}
