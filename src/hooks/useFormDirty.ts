'use client';

import { useMemo } from 'react';

export function useFormDirty<T>(current: T, initial: T): boolean {
  return useMemo(() => {
    try {
      return JSON.stringify(current) !== JSON.stringify(initial);
    } catch {
      return current !== initial;
    }
  }, [current, initial]);
}

export function hasNonEmptyFields(values: Record<string, unknown>): boolean {
  return Object.values(values).some((v) => {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v as object).length > 0;
    return true;
  });
}
