'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type UseDebouncedSyncOptions<T> = {
  /** External source of truth (e.g. tpData field). */
  external: T;
  /** Called after debounce when local draft should sync upstream. */
  onSync: (value: T) => void;
  /** Debounce delay in ms. Default 200. */
  delay?: number;
  /** Equality check; defaults to Object.is. */
  isEqual?: (a: T, b: T) => boolean;
};

/**
 * Local draft state that updates immediately, with debounced upstream sync.
 * Resets from `external` when it changes outside of our own sync (autofill/load).
 */
export function useDebouncedSync<T>({
  external,
  onSync,
  delay = 200,
  isEqual = Object.is,
}: UseDebouncedSyncOptions<T>) {
  const [value, setValue] = useState(external);
  const lastSyncedRef = useRef(external);
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    if (pendingRef.current === null) return;
    const next = pendingRef.current;
    pendingRef.current = null;
    if (isEqual(next, lastSyncedRef.current)) return;
    lastSyncedRef.current = next;
    onSyncRef.current(next);
  }, [clearTimer, isEqual]);

  const setDraft = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        pendingRef.current = resolved;
        clearTimer();
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const pending = pendingRef.current;
          if (pending === null) return;
          pendingRef.current = null;
          if (isEqual(pending, lastSyncedRef.current)) return;
          lastSyncedRef.current = pending;
          onSyncRef.current(pending);
        }, delay);
        return resolved;
      });
    },
    [clearTimer, delay, isEqual]
  );

  // External change (autofill / load): reset local draft when not from our sync.
  useEffect(() => {
    if (isEqual(external, lastSyncedRef.current)) return;
    clearTimer();
    pendingRef.current = null;
    lastSyncedRef.current = external;
    setValue(external);
  }, [external, clearTimer, isEqual]);

  useEffect(() => {
    return () => {
      // Flush pending sync on unmount so drafts are not lost.
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingRef.current !== null) {
        const next = pendingRef.current;
        pendingRef.current = null;
        if (!isEqual(next, lastSyncedRef.current)) {
          lastSyncedRef.current = next;
          onSyncRef.current(next);
        }
      }
    };
  }, [isEqual]);

  return { value, setDraft, flush };
}
