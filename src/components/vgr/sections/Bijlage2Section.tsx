'use client';

import {
  A4LogoHeader,
  A4Page,
  FooterIdentity,
  TP2026_A4_PAGE_CLASS,
} from '@/components/tp2026/primitives';
import { PrintCheckbox } from '@/components/tp2026/PrintCheckbox';
import type { VGRBijlage2Model, VGRBijlage2PowTrede } from '@/lib/vgr/schema';
import { BIJLAGE2_FOOTNOTES, BIJLAGE2_SECTION_BASIS } from '@/lib/vgr/bijlage2-official';
import { formatNLDate } from '@/lib/vgr/schema';
import { TP2026_CELL_BG_WARM_CLASS } from '@/lib/tp2026/tp2026-colors';
import { useEffect, useMemo, type ReactElement } from 'react';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { ChevronRight } from 'lucide-react';

const BIJLAGE2_CHECKLIST_GROUPS = ['willen', 'weten', 'kunnen', 'doen'] as const;

const BIJLAGE_EDITOR_DETAILS_CLASS =
  'group rounded-md border border-border bg-muted/15 open:bg-white [&>summary::-webkit-details-marker]:hidden';

const BIJLAGE_EDITOR_SUMMARY_CLASS =
  'flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-[#6d2a96]';

function bijlage2GroupLabel(group: (typeof BIJLAGE2_CHECKLIST_GROUPS)[number]): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

export function Bijlage2Editor({
  model,
  setModel,
}: {
  model: VGRBijlage2Model;
  setModel: (next: VGRBijlage2Model) => void;
}) {
  const sortedPow = useMemo(
    () => [...model.powTredes].sort((a, b) => a.trede - b.trede),
    [model.powTredes]
  );

  const updateChecklist = (group: (typeof BIJLAGE2_CHECKLIST_GROUPS)[number], idx: number, checked: boolean) => {
    setModel({
      ...model,
      [group]: model[group].map((r, i) => (i === idx ? { ...r, checked } : r)),
    });
  };

  const updatePowCriterion = (trede: number, critIdx: number, checked: boolean) => {
    setModel({
      ...model,
      powTredes: model.powTredes.map((t) =>
        t.trede === trede
          ? { ...t, criteria: t.criteria.map((c, i) => (i === critIdx ? { ...c, checked } : c)) }
          : t
      ),
    });
  };

  return (
    <div className="space-y-3">
      {BIJLAGE2_CHECKLIST_GROUPS.map((group, groupIdx) => {
        const rows = model[group];
        const checkedCount = rows.filter((r) => r.checked).length;
        return (
          <details
            key={group}
            className={BIJLAGE_EDITOR_DETAILS_CLASS}
            open={groupIdx === 0}
          >
            <summary className={BIJLAGE_EDITOR_SUMMARY_CLASS}>
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
              <span>
                {bijlage2GroupLabel(group)} ({checkedCount}/{rows.length})
              </span>
            </summary>
            <div className="space-y-1 border-t border-border px-3 pb-3 pt-2">
              {rows.map((row, idx) => (
                <label key={idx} className="flex items-start gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0"
                    checked={row.checked}
                    onChange={(e) => updateChecklist(group, idx, e.target.checked)}
                  />
                  <span>{row.label}</span>
                </label>
              ))}
            </div>
          </details>
        );
      })}

      <details className={BIJLAGE_EDITOR_DETAILS_CLASS} open>
        <summary className={BIJLAGE_EDITOR_SUMMARY_CLASS}>
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span>Activeringsinterventies</span>
            <span className="text-xs font-semibold text-[#6d2a96]/80">POW-meter™</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
          {sortedPow.map((t) => (
            <details
              key={t.trede}
              className="rounded border border-border bg-muted/15 open:bg-white [&>summary::-webkit-details-marker]:hidden"
              open={t.trede === 1}
            >
              <summary className="cursor-pointer px-2 py-1.5 text-sm font-semibold text-[#6d2a96]">
                Trede {t.trede}
              </summary>
              <div className="space-y-1 px-2 pb-2">
                <p className="text-xs text-muted-foreground">
                  Trede {t.trede} is succesvol afgerond wanneer:
                </p>
                {t.criteria.map((c, i) => (
                  <label key={i} className="flex items-start gap-2 py-0.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      checked={c.checked}
                      onChange={(e) => updatePowCriterion(t.trede, i, e.target.checked)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </details>
          ))}
          <p className="mt-2 text-xs italic text-muted-foreground">{BIJLAGE2_FOOTNOTES[0]}</p>
          <p className="text-xs italic text-muted-foreground">{BIJLAGE2_FOOTNOTES[1]}</p>
        </div>
      </details>
    </div>
  );
}

const BIJLAGE2_TREDE_BADGE: Record<number, string> = {
  1: 'bg-[#ebe1cf] text-[#3d2f1f]',
  2: 'bg-[#c8e6c9] text-[#1b3d1c]',
  3: 'bg-[#a8d5cf] text-[#0d3d38]',
  4: 'bg-[#e6d5a8] text-[#4a3d12]',
  5: 'bg-[#e8b89a] text-[#4a2612]',
  6: 'bg-[#7d5a96] text-white',
};

function Bijlage2TitleBlock() {
  return (
    <div className="mb-2 shrink-0">
      <div className="text-[10pt] leading-tight font-bold tracking-tight text-[#d4694a]">Bijlage 2</div>
      <div className="mt-0.5 text-[10pt] leading-tight font-bold tracking-tight text-[#2d8f82]">
        ValentineZ leernavigator
      </div>
      <div className="mt-2 text-[10pt] font-bold leading-tight text-[#6d2a96]">{BIJLAGE2_SECTION_BASIS}</div>
    </div>
  );
}

/** One body row, four cells — each cell lists the full column (Word/Google Doc style). */
function Bijlage2BasisTable({ model }: { model: VGRBijlage2Model }) {
  const cols = [model.willen, model.weten, model.kunnen, model.doen] as const;
  const headers = ['WILLEN', 'WETEN', 'KUNNEN', 'DOEN'] as const;
  return (
    <table className="w-full shrink-0 border-collapse border-[0.5pt] border-[#c4b37b] table-fixed">
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '25%' }} />
        <col style={{ width: '25%' }} />
        <col style={{ width: '25%' }} />
      </colgroup>
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className={`border-[0.5pt] border-[#c4b37b] ${TP2026_CELL_BG_WARM_CLASS} px-1 py-0.5 text-center text-[10pt] font-bold uppercase tracking-tight text-[#6d2a96]`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {cols.map((col, ci) => (
            <td
              key={ci}
              className="border-[0.5pt] border-[#c4b37b] bg-white px-1.5 py-1 align-top text-[7pt] leading-[1.45] text-neutral-900"
            >
              {col.map((row, ri) => (
                <div key={ri} className="flex break-words items-start gap-1 pb-1 last:pb-0">
                  <PrintCheckbox checked={row.checked} className="mt-0.5" size={9} />
                  <span>{row.label}</span>
                </div>
              ))}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function Bijlage2PowHeaderRow() {
  return (
    <div className="mt-3 mb-1 flex w-full shrink-0 items-baseline justify-between text-[10pt] font-bold text-[#6d2a96]">
      <span>Activeringsinterventies</span>
      <span className="pr-1">POW-meter™</span>
    </div>
  );
}

function Bijlage2PowRows({ tredes }: { tredes: VGRBijlage2PowTrede[] }) {
  return (
    <table className="w-full border-collapse border-[0.5pt] border-[#c4b37b] text-[7pt] leading-[1.45]">
      <tbody>
        {tredes.map((t) => (
          <tr key={t.trede}>
            <td className="w-[78%] border-[0.5pt] border-[#c4b37b] bg-white px-1.5 py-1 align-top text-neutral-900">
              <div className="mb-1 font-bold text-[#6d2a96]">
                Trede {t.trede} is succesvol afgerond wanneer:
              </div>
              <div>
                {t.criteria.map((c, idx) => (
                  <div key={idx} className="flex break-words items-start gap-1 pb-1 last:pb-0">
                    <PrintCheckbox checked={c.checked} className="mt-0.5" size={9} />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </td>
            <td
              className={`w-[22%] border-[0.5pt] border-[#c4b37b] px-1 py-1.5 align-middle text-center text-[8pt] font-bold leading-snug ${BIJLAGE2_TREDE_BADGE[t.trede] ?? 'bg-[#ebe1cf] text-[#6d2a96]'}`}
            >
              Trede {t.trede}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const bijlage2BodyClass = 'flex min-h-0 flex-1 flex-col overflow-hidden';

/** Rough height (px) for one POW trede row — packs whole tredes only; split between pages at row boundaries. */
function estimatePowTredeHeightPx(t: VGRBijlage2PowTrede): number {
  const criteria = t.criteria?.length ?? 0;
  const textChars = (t.criteria ?? []).reduce((n, c) => n + String(c.label || '').length, 0);
  return 40 + criteria * 15 + Math.min(textChars * 0.26, 100);
}

/**
 * Split all tredes into consecutive chunks for A4 pages. First chunk shares page 1 with basis + header;
 * later chunks get full pages. Smallest unit = one trede (one table row).
 */
function chunkPowTredesForA4(
  tredes: VGRBijlage2PowTrede[],
  firstPageBudgetPx: number,
  continuationPageBudgetPx: number
): VGRBijlage2PowTrede[][] {
  if (!tredes.length) return [];
  const chunks: VGRBijlage2PowTrede[][] = [];
  let i = 0;
  let pageIdx = 0;
  while (i < tredes.length) {
    const budget = pageIdx === 0 ? firstPageBudgetPx : continuationPageBudgetPx;
    const slice: VGRBijlage2PowTrede[] = [];
    let used = 0;
    while (i < tredes.length) {
      const cost = estimatePowTredeHeightPx(tredes[i]);
      if (slice.length > 0 && used + cost > budget) break;
      slice.push(tredes[i]);
      used += cost;
      i += 1;
    }
    if (slice.length === 0) {
      slice.push(tredes[i]);
      i += 1;
    }
    chunks.push(slice);
    pageIdx += 1;
  }
  return chunks;
}

function Bijlage2FootnotesBlock() {
  return (
    <div className="mt-2 shrink-0 space-y-0.5 text-[7pt] italic leading-snug text-neutral-800">
      {BIJLAGE2_FOOTNOTES.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

/**
 * Vertical budget (px) for POW trede rows after fixed chrome on the page.
 * A4 body is ~1123px; logo flow spacer + titles + 4-col basis + POW header consume the rest — 380 was far too low
 * (left half a page empty). Values are heuristics aligned with print preview.
 */
const BIJLAGE2_POW_BUDGET_AFTER_BASIS_PX = 640;
const BIJLAGE2_POW_BUDGET_FULL_PAGE_PX = 900;

export function Bijlage2A4Pages({
  data,
  model,
  printMode = false,
}: {
  data: Record<string, any>;
  model: VGRBijlage2Model;
  printMode?: boolean;
}) {
  const { getSectionStartPage, setSectionPageCount } = useVGRPageNumber();
  const powSorted = useMemo(
    () => [...model.powTredes].sort((a, b) => a.trede - b.trede),
    [model.powTredes]
  );

  const powChunks = useMemo(
    () => chunkPowTredesForA4(powSorted, BIJLAGE2_POW_BUDGET_AFTER_BASIS_PX, BIJLAGE2_POW_BUDGET_FULL_PAGE_PX),
    [powSorted]
  );

  const pageCount = powChunks.length === 0 ? 1 : powChunks.length;

  useEffect(() => {
    setSectionPageCount('bijlage2', pageCount);
  }, [pageCount, setSectionPageCount]);

  const pageShellClass = `${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`;
  const startPage = getSectionStartPage('bijlage2');

  const pages = useMemo(() => {
    const out: ReactElement[] = [];
    const footer = (pageIndex: number) => (
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={startPage + pageIndex}
      />
    );

    if (powChunks.length === 0) {
      out.push(
        <A4Page key="b2-only-basis" className={pageShellClass}>
          <div className={bijlage2BodyClass}>
            <A4LogoHeader />
            <Bijlage2TitleBlock />
            <Bijlage2BasisTable model={model} />
            <Bijlage2FootnotesBlock />
          </div>
          {footer(0)}
        </A4Page>
      );
      return out;
    }

    const lastChunkIdx = powChunks.length - 1;

    out.push(
      <A4Page key="b2-p1" className={pageShellClass}>
        <div className={bijlage2BodyClass}>
          <A4LogoHeader />
          <Bijlage2TitleBlock />
          <Bijlage2BasisTable model={model} />
          <Bijlage2PowHeaderRow />
          <Bijlage2PowRows tredes={powChunks[0]} />
          {lastChunkIdx === 0 ? <Bijlage2FootnotesBlock /> : null}
        </div>
        {footer(0)}
      </A4Page>
    );

    for (let ci = 1; ci < powChunks.length; ci++) {
      const isLast = ci === lastChunkIdx;
      out.push(
        <A4Page key={`b2-pow-${ci}`} className={pageShellClass}>
          <div className={bijlage2BodyClass}>
            <A4LogoHeader />
            <Bijlage2PowRows tredes={powChunks[ci]} />
            {isLast ? <Bijlage2FootnotesBlock /> : null}
          </div>
          {footer(ci)}
        </A4Page>
      );
    }

    return out;
  }, [data, model, pageShellClass, powChunks, startPage]);

  if (printMode) {
    return (
      <>
        {pages.map((node, idx) => (
          <section className="print-page" key={`print-b2-${idx}`}>
            {node}
          </section>
        ))}
      </>
    );
  }

  return <>{pages}</>;
}
