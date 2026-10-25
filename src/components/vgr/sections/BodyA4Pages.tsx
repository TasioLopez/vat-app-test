'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { A4LogoHeader, A4Page, FooterIdentity, TP2026_A4_PAGE_CLASS } from '@/components/tp2026/primitives';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { VGR_CHAPTERS, VGR_POW_CHART_SRC } from '@/lib/vgr/content';
import {
  VGR_BODY_TEXT_CLASS,
  buildVgrBodyAtoms,
  splitVgrBodyAtom,
  vgrTocEntries,
  type VGRBodyAtom,
} from '@/lib/vgr/body-atoms';
import type { VGRData } from '@/lib/vgr/schema';

/** A4 794px minus 2 × 96px body margin. */
const CONTENT_WIDTH_PX = 602;
const ATOM_GAP_PX = 6;
const MAX_SPLIT_ROUNDS = 12;

/* ------------------------------------------------------------------ */
/* Page shells                                                         */
/* ------------------------------------------------------------------ */

function BodyFooter({ data, pageNumber }: { data: VGRData; pageNumber: number }) {
  return (
    <FooterIdentity
      lastName={data.last_name}
      firstName={data.first_name}
      dateOfBirth={formatNLDateForDoc(data.date_of_birth)}
      pageNumber={pageNumber}
    />
  );
}

function BodyPage({
  data,
  pageNumber,
  children,
}: {
  data: VGRData;
  pageNumber: number;
  children: React.ReactNode;
}) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ rowGap: ATOM_GAP_PX }}
        data-vgr-body-content
      >
        {children}
      </div>
      <BodyFooter data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

function TocPage({ data, pageNumber }: { data: VGRData; pageNumber: number }) {
  const toc = vgrTocEntries(data);
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 text-[14pt] font-extrabold leading-tight text-[#702A90]">Inhoudsopgave</div>
        <div className="flex flex-col gap-3">
          {toc.map((group) => {
            const ch = VGR_CHAPTERS.find((c) => c.id === group.chapter)!;
            return (
              <div key={group.chapter}>
                <div
                  className="px-2.5 py-1.5 text-[11pt] font-bold leading-tight text-white"
                  style={{ backgroundColor: ch.color }}
                >
                  {ch.title}
                </div>
                <ul className={`${VGR_BODY_TEXT_CLASS} mt-1 flex flex-col gap-0.5 pl-2.5`}>
                  {group.entries.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <BodyFooter data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

/* ------------------------------------------------------------------ */
/* Measurement                                                         */
/* ------------------------------------------------------------------ */

function mountOffscreen(): HTMLDivElement {
  const mount = document.createElement('div');
  mount.setAttribute('aria-hidden', 'true');
  mount.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;max-width:794px;pointer-events:none;visibility:hidden;z-index:-9999;';
  document.body.appendChild(mount);
  return mount;
}

/** Height available for atoms inside a BodyPage (probe render). */
function measureAvailableHeight(data: VGRData): number {
  const mount = mountOffscreen();
  const root = createRoot(mount);
  try {
    flushSync(() => {
      root.render(
        <BodyPage data={data} pageNumber={1}>
          <div />
        </BodyPage>
      );
    });
    const el = mount.querySelector('[data-vgr-body-content]') as HTMLElement | null;
    return el ? el.clientHeight : 880;
  } finally {
    root.unmount();
    mount.remove();
  }
}

function measureAtomHeights(atoms: VGRBodyAtom[]): number[] {
  const mount = mountOffscreen();
  const root = createRoot(mount);
  try {
    flushSync(() => {
      root.render(
        <div
          style={{
            width: CONTENT_WIDTH_PX,
            fontFamily: 'var(--font-montserrat), Montserrat, system-ui, sans-serif',
          }}
          className="flex flex-col"
        >
          {atoms.map((a, i) => (
            <div key={a.id} data-atom-idx={i} className="flex flex-col">
              {a.node}
            </div>
          ))}
        </div>
      );
    });
    const out: number[] = [];
    for (let i = 0; i < atoms.length; i++) {
      const el = mount.querySelector(`[data-atom-idx="${i}"]`) as HTMLElement | null;
      out.push(el ? el.getBoundingClientRect().height : 0);
    }
    return out;
  } finally {
    root.unmount();
    mount.remove();
  }
}

type PackResult = { ok: true; pages: number[][] } | { ok: false; oversized: number };

function packAtoms(atoms: VGRBodyAtom[], heights: number[], avail: number): PackResult {
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;

  const heightOf = (i: number) => heights[i] + (current.length ? ATOM_GAP_PX : 0);

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    used = 0;
  };

  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i];
    if (heights[i] > avail) return { ok: false, oversized: i };

    if (atom.pageBreakBefore && current.length) flush();

    if (used + heightOf(i) > avail) {
      // keepWithNext chain: pull trailing headings over to the next page.
      const carried: number[] = [];
      while (current.length && atoms[current[current.length - 1]].keepWithNext) {
        carried.unshift(current.pop()!);
      }
      flush();
      for (const c of carried) {
        used += heights[c] + (current.length ? ATOM_GAP_PX : 0);
        current.push(c);
      }
      if (used + heightOf(i) > avail) {
        // carried headings + atom still too big: give up on keep-with-next for this spot
        flush();
      }
    }
    used += heightOf(i);
    current.push(i);
  }
  flush();
  return { ok: true, pages };
}

async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        })
    )
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function BodyA4Pages({
  data,
  printMode = false,
  onPaginationReady,
}: {
  data: VGRData;
  printMode?: boolean;
  onPaginationReady?: () => void;
}) {
  const { getSectionStartPage, setSectionPageCount } = useVGRPageNumber();
  const baseline = useMemo(() => buildVgrBodyAtoms(data), [data]);
  const [displayAtoms, setDisplayAtoms] = useState<VGRBodyAtom[]>(baseline);
  const [pages, setPages] = useState<number[][]>([]);
  const [paginating, setPaginating] = useState(true);
  const genRef = useRef(0);
  const readyRef = useRef(false);

  const emitReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setPaginating(false);
    onPaginationReady?.();
  }, [onPaginationReady]);

  const run = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const gen = ++genRef.current;
    readyRef.current = false;
    setPaginating(true);

    if (document.fonts) await document.fonts.ready;
    await preloadImages([VGR_POW_CHART_SRC]);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    if (gen !== genRef.current) return;

    const avail = measureAvailableHeight(data);
    let atoms = baseline;
    let result: PackResult = { ok: false, oversized: -1 };
    for (let round = 0; round < MAX_SPLIT_ROUNDS; round++) {
      const heights = measureAtomHeights(atoms);
      result = packAtoms(atoms, heights, avail);
      if (result.ok) break;
      const parts = splitVgrBodyAtom(atoms[result.oversized]);
      if (!parts) {
        console.warn(`VGR body: atom ${atoms[result.oversized].id} does not fit on a page and cannot be split.`);
        // Force-fit: keep it on its own page (will be clipped visually).
        const idx = result.oversized;
        const forced = [...atoms];
        forced[idx] = { ...forced[idx], pageBreakBefore: true, splitText: undefined };
        const heights2 = measureAtomHeights(forced).map((h, i) => (i === idx ? avail : h));
        const r2 = packAtoms(forced, heights2, avail);
        result = r2.ok ? r2 : { ok: true, pages: forced.map((_, i) => [i]) };
        atoms = forced;
        break;
      }
      atoms = [...atoms.slice(0, result.oversized), ...parts, ...atoms.slice(result.oversized + 1)];
    }
    if (gen !== genRef.current) return;

    setDisplayAtoms(atoms);
    setPages(result.ok ? result.pages : atoms.map((_, i) => [i]));
    emitReady();
  }, [baseline, data, emitReady]);

  useLayoutEffect(() => {
    const delay = printMode ? 0 : 350;
    const t = window.setTimeout(() => void run(), delay);
    return () => window.clearTimeout(t);
  }, [run, printMode]);

  useEffect(() => {
    if (!paginating) setSectionPageCount('body', 1 + pages.length);
  }, [paginating, pages.length, setSectionPageCount]);

  const start = getSectionStartPage('body');

  const wrap = (node: React.ReactNode, key: React.Key) =>
    printMode ? (
      <section className="print-page" key={key}>
        {node}
      </section>
    ) : (
      <div key={key}>{node}</div>
    );

  if (paginating && pages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Pagineren…</p>
      </div>
    );
  }

  return (
    <>
      {wrap(<TocPage data={data} pageNumber={start} />, 'body-toc')}
      {pages.map((idxs, pi) =>
        wrap(
          <BodyPage data={data} pageNumber={start + 1 + pi}>
            {idxs.map((i) => (
              <div key={displayAtoms[i]?.id ?? i} className="flex flex-col" style={{ rowGap: ATOM_GAP_PX }}>
                {displayAtoms[i]?.node}
              </div>
            ))}
          </BodyPage>,
          `body-${pi}`
        )
      )}
    </>
  );
}
