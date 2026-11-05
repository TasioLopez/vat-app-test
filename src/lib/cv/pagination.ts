/**
 * Pure CV column pagination helpers.
 * Heights are in CSS pixels; pageInnerHeight is the usable column content height.
 */

export type CvMeasuredAtom = {
  id: string;
  height: number;
};

export type CvPackedColumn = {
  /** Atom ids per page (index 0 = first page). */
  pages: string[][];
};

const EPS = 0.5;

export type PackColumnOptions = {
  /**
   * Usable height of page 0 when it is shorter than the rest (Creatief band).
   * Later pages use `pageInnerHeight`. An atom that does not fit page 0 but
   * fits a full page starts on page 1, leaving page 0 empty so the band is kept.
   */
  firstPageInnerHeight?: number;
};

/**
 * First-fit pack atoms into pages. Never drops atoms.
 * Inserts `gapPx` between consecutive atoms on the same page.
 * Oversized atoms (taller than one page) get their own page.
 */
export function packColumn(
  atoms: CvMeasuredAtom[],
  pageInnerHeight: number,
  gapPx: number,
  opts?: PackColumnOptions
): string[][] {
  const maxH = Math.max(1, pageInnerHeight);
  const firstH = Math.max(1, opts?.firstPageInnerHeight ?? maxH);
  const firstIsShorter = firstH + EPS < maxH;
  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  let pageIndex = 0;

  const limitFor = (index: number) => (index === 0 ? firstH : maxH);

  const closePage = () => {
    pages.push(current);
    current = [];
    used = 0;
    pageIndex = pages.length;
  };

  for (const atom of atoms) {
    const h = Math.max(0, atom.height);
    if (h <= 0) {
      // Zero-height chrome/empty — skip so it cannot create pages.
      continue;
    }

    const pageLimit = limitFor(pageIndex);
    if (h > pageLimit + EPS) {
      if (current.length) closePage();
      else if (firstIsShorter && pageIndex === 0 && pages.length === 0) {
        pages.push([]);
        pageIndex = 1;
      }
      const nextLimit = limitFor(pageIndex);
      if (h > nextLimit + EPS) {
        if (current.length) closePage();
        pages.push([atom.id]);
        pageIndex = pages.length;
        continue;
      }
      current = [atom.id];
      used = h;
      continue;
    }

    const need = current.length === 0 ? h : h + gapPx;
    if (current.length > 0 && used + need > pageLimit + EPS) {
      closePage();
      current = [atom.id];
      used = h;
    } else {
      current.push(atom.id);
      used += need;
    }
  }

  if (current.length) pages.push(current);
  return pages;
}

/** Page count for two independently packed columns. */
export function twoColumnPageCount(sidebarPages: string[][], mainPages: string[][]): number {
  return Math.max(1, sidebarPages.length, mainPages.length);
}

/** Slice for a page index; empty array when that column has no content on the page. */
export function pageSlice(pages: string[][], pageIndex: number): string[] {
  return pages[pageIndex] ?? [];
}

/**
 * True when a trailing page would be empty on both columns (should not emit).
 * Leading empty pages are also stripped by normalizePackedPages.
 */
export function normalizePackedPages(
  sidebarPages: string[][],
  mainPages: string[][],
  opts?: { preserveFirstPage?: boolean }
): { sidebarPages: string[][]; mainPages: string[][]; pageCount: number } {
  const count = twoColumnPageCount(sidebarPages, mainPages);
  let start = 0;
  let end = count;

  if (!opts?.preserveFirstPage) {
    while (start < end && pageSlice(sidebarPages, start).length === 0 && pageSlice(mainPages, start).length === 0) {
      start += 1;
    }
  }
  while (end > start && pageSlice(sidebarPages, end - 1).length === 0 && pageSlice(mainPages, end - 1).length === 0) {
    end -= 1;
  }

  if (start >= end) {
    return { sidebarPages: [[]], mainPages: [[]], pageCount: 1 };
  }

  const nextSidebar: string[][] = [];
  const nextMain: string[][] = [];
  for (let i = start; i < end; i += 1) {
    nextSidebar.push(pageSlice(sidebarPages, i));
    nextMain.push(pageSlice(mainPages, i));
  }
  return {
    sidebarPages: nextSidebar,
    mainPages: nextMain,
    pageCount: nextSidebar.length,
  };
}

/** Single-column normalize: drop empty leading/trailing pages. */
export function normalizeSingleColumnPages(pages: string[][]): string[][] {
  let start = 0;
  let end = pages.length;
  while (start < end && (pages[start]?.length ?? 0) === 0) start += 1;
  while (end > start && (pages[end - 1]?.length ?? 0) === 0) end -= 1;
  if (start >= end) return [[]];
  return pages.slice(start, end);
}

/**
 * Rough text split for oversized description atoms.
 * Splits near the middle on a paragraph or sentence boundary when possible.
 */
export function splitTextNearMiddle(text: string): [string, string] | null {
  const trimmed = text.trim();
  if (trimmed.length < 40) return null;
  const mid = Math.floor(trimmed.length / 2);
  const window = trimmed.slice(Math.max(0, mid - 80), Math.min(trimmed.length, mid + 80));
  const para = window.lastIndexOf('\n\n');
  const sentence = window.search(/[.!?]\s/);
  let cut = mid;
  if (para >= 0) {
    cut = Math.max(0, mid - 80) + para + 2;
  } else if (sentence >= 0) {
    cut = Math.max(0, mid - 80) + sentence + 2;
  }
  cut = Math.min(Math.max(cut, 20), trimmed.length - 20);
  const a = trimmed.slice(0, cut).trimEnd();
  const b = trimmed.slice(cut).trimStart();
  if (!a || !b) return null;
  return [a, b];
}
