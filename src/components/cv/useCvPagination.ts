'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  normalizePackedPages,
  normalizeSingleColumnPages,
  packColumn,
  type CvMeasuredAtom,
} from '@/lib/cv/pagination';

const PAGE_HEIGHT_MM = 297;
/** Matches theme column gap-6 (1.5rem). */
export const CV_ATOM_GAP_PX = 24;

export function useA4PageHeightPx(): number {
  const [pageHeightPx, setPageHeightPx] = useState(0);

  useLayoutEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;height:${PAGE_HEIGHT_MM}mm;width:0;pointer-events:none;`;
    document.body.appendChild(probe);
    setPageHeightPx(Math.max(1, probe.offsetHeight));
    document.body.removeChild(probe);
  }, []);

  return pageHeightPx;
}

function measureAtoms(container: HTMLElement | null): CvMeasuredAtom[] {
  if (!container) return [];
  const nodes = container.querySelectorAll<HTMLElement>('[data-cv-atom]');
  const out: CvMeasuredAtom[] = [];
  nodes.forEach((node) => {
    const id = node.dataset.cvAtom;
    if (!id) return;
    out.push({ id, height: node.getBoundingClientRect().height });
  });
  return out;
}

type TwoColumnResult = {
  mode: 'two_column';
  sidebarPages: string[][];
  mainPages: string[][];
  pageCount: number;
  ready: boolean;
};

type SingleResult = {
  mode: 'single';
  pages: string[][];
  pageCount: number;
  ready: boolean;
};

export type CvPaginationResult = TwoColumnResult | SingleResult;

export function useCvTwoColumnPagination(opts: {
  measureSidebarRef: React.RefObject<HTMLElement | null>;
  measureMainRef: React.RefObject<HTMLElement | null>;
  /** Usable content height inside a column (page minus vertical padding). */
  pageInnerHeightPx: number;
  deps: unknown[];
  debounceMs: number;
  enabled?: boolean;
}): TwoColumnResult {
  const {
    measureSidebarRef,
    measureMainRef,
    pageInnerHeightPx,
    deps,
    debounceMs,
    enabled = true,
  } = opts;
  const [result, setResult] = useState<TwoColumnResult>({
    mode: 'two_column',
    sidebarPages: [[]],
    mainPages: [[]],
    pageCount: 1,
    ready: false,
  });
  const genRef = useRef(0);

  useLayoutEffect(() => {
    if (!enabled || pageInnerHeightPx <= 0) return;
    const gen = ++genRef.current;
    setResult((prev) => ({ ...prev, ready: false }));

    const run = () => {
      if (gen !== genRef.current) return;
      const sidebarMeasured = measureAtoms(measureSidebarRef.current);
      const mainMeasured = measureAtoms(measureMainRef.current);
      const sidebarPacked = packColumn(sidebarMeasured, pageInnerHeightPx, CV_ATOM_GAP_PX);
      const mainPacked = packColumn(mainMeasured, pageInnerHeightPx, CV_ATOM_GAP_PX);
      const normalized = normalizePackedPages(sidebarPacked, mainPacked);
      setResult({
        mode: 'two_column',
        sidebarPages: normalized.sidebarPages,
        mainPages: normalized.mainPages,
        pageCount: normalized.pageCount,
        ready: true,
      });
    };

    if (debounceMs <= 0) {
      run();
      const t = window.setTimeout(run, 80);
      return () => {
        genRef.current += 1;
        window.clearTimeout(t);
      };
    }

    const t = window.setTimeout(run, debounceMs);
    return () => {
      genRef.current += 1;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
  }, [enabled, pageInnerHeightPx, debounceMs, ...deps]);

  return result;
}

export function useCvSingleColumnPagination(opts: {
  measureRef: React.RefObject<HTMLElement | null>;
  pageInnerHeightPx: number;
  deps: unknown[];
  debounceMs: number;
  enabled?: boolean;
}): SingleResult {
  const { measureRef, pageInnerHeightPx, deps, debounceMs, enabled = true } = opts;
  const [result, setResult] = useState<SingleResult>({
    mode: 'single',
    pages: [[]],
    pageCount: 1,
    ready: false,
  });
  const genRef = useRef(0);

  useLayoutEffect(() => {
    if (!enabled || pageInnerHeightPx <= 0) return;
    const gen = ++genRef.current;
    setResult((prev) => ({ ...prev, ready: false }));

    const run = () => {
      if (gen !== genRef.current) return;
      const measured = measureAtoms(measureRef.current);
      const packed = packColumn(measured, pageInnerHeightPx, CV_ATOM_GAP_PX);
      const pages = normalizeSingleColumnPages(packed);
      setResult({
        mode: 'single',
        pages,
        pageCount: Math.max(1, pages.length),
        ready: true,
      });
    };

    if (debounceMs <= 0) {
      run();
      const t = window.setTimeout(run, 80);
      return () => {
        genRef.current += 1;
        window.clearTimeout(t);
      };
    }

    const t = window.setTimeout(run, debounceMs);
    return () => {
      genRef.current += 1;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
  }, [enabled, pageInnerHeightPx, debounceMs, ...deps]);

  return result;
}
