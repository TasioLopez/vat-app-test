'use client';

import {
  A4LogoHeader,
  A4Page,
  A4_H,
  A4_W,
  FooterIdentity,
  TP2026_A4_PAGE_CLASS,
} from '@/components/tp2026/primitives';
import { PrintJaNeeChecks } from '@/components/tp2026/PrintCheckbox';
import type { VGRBijlage3Decision } from '@/lib/vgr/schema';
import { BIJLAGE3_PAGE2, BIJLAGE3_STEP_7_ID } from '@/lib/vgr/bijlage3-official';
import { TP2026_BODY_FLOW_START_SPACER_PX } from '@/lib/tp2026/document-layout';
import { formatNLDate } from '@/lib/vgr/schema';
import { TP2026_CELL_BG_WARM_CLASS, TP2026_HTML_TABLE_CLASS } from '@/lib/tp2026/tp2026-colors';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { cn } from '@/lib/utils';
import { ChevronRight, Check, X } from 'lucide-react';

const BIJLAGE2_TREDE_BADGE: Record<number, string> = {
  1: 'bg-[#ebe1cf] text-[#3d2f1f]',
  2: 'bg-[#c8e6c9] text-[#1b3d1c]',
  3: 'bg-[#a8d5cf] text-[#0d3d38]',
  4: 'bg-[#e6d5a8] text-[#4a3d12]',
  5: 'bg-[#e8b89a] text-[#4a2612]',
  6: 'bg-[#7d5a96] text-white',
};

const BIJLAGE_EDITOR_DETAILS_CLASS =
  'group rounded-md border border-border bg-muted/15 open:bg-white [&>summary::-webkit-details-marker]:hidden';

const BIJLAGE_EDITOR_SUMMARY_CLASS =
  'flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-[#6d2a96]';

function Bijlage3TitleBlock({ continued = false }: { continued?: boolean }) {
  return (
    <div className="mb-2 shrink-0">
      <div className="text-[10pt] leading-tight font-bold tracking-tight text-[#d4694a]">Bijlage 3</div>
      <div className="mt-0.5 text-[10pt] leading-tight font-bold tracking-tight text-[#2d8f82]">
        Stroomschema POW-meter™
        {continued ? <span className="font-normal text-neutral-600"> (vervolg)</span> : null}
      </div>
    </div>
  );
}

function bijlage3DoelChecksPrint(ja?: boolean, nee?: boolean) {
  return (
    <PrintJaNeeChecks
      value={ja ? true : nee ? false : undefined}
      className="text-[7pt] leading-tight"
    />
  );
}

const BIJLAGE3_PRINT_HEADERS = [
  'Vragen stroomschema',
  '',
  'Trede-bepaling',
  'Doel uren %',
  'Werkboeken',
  'Doel behaald',
] as const;

function renderBijlage3QuestionCell(step: VGRBijlage3Decision) {
  const normalize = (t?: string) => String(t || '').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const question = normalize(step.question);
  const subtitle = normalize(step.questionSubtitle);
  const hint = normalize(step.hint);

  return (
    <>
      <div className="font-bold leading-snug">{question}</div>
      {subtitle ? <div className="mt-0.5 leading-snug text-neutral-800">{subtitle}</div> : null}
      {hint ? <div className="mt-1 leading-snug font-normal text-neutral-800">{hint}</div> : null}
    </>
  );
}

const BIJLAGE3_TABLE_SHELL_CLASS = `${TP2026_HTML_TABLE_CLASS} shrink-0 text-[7pt] leading-[1.45] text-neutral-900`;

function Bijlage3TableColGroup() {
  return (
    <colgroup>
      <col style={{ width: '31%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '16%' }} />
      <col style={{ width: '13%' }} />
    </colgroup>
  );
}

function Bijlage3TableThead() {
  return (
    <thead>
      <tr>
        {BIJLAGE3_PRINT_HEADERS.map((h, idx) => (
          <th
            key={`${h}-${idx}`}
            className={`${TP2026_CELL_BG_WARM_CLASS} px-1 py-0.5 text-center text-[8pt] font-bold tracking-tight text-[#6d2a96]`}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Bijlage3StepTbody({ step }: { step: VGRBijlage3Decision }) {
  const tredeCellClass = (n: number) =>
    `${BIJLAGE2_TREDE_BADGE[n] ?? 'bg-[#ebe1cf] text-[#6d2a96]'}`;

  return (
    <tbody data-b3-step-id={step.id}>
      <tr>
        <td className="bg-white px-1.5 py-1 align-top">
          {renderBijlage3QuestionCell(step)}
        </td>
        <td className="bg-white px-1 py-1 align-top text-center">
          <div className="font-bold text-[#d4694a]">NEE &gt;</div>
        </td>
        <td className={`px-1 py-1 align-top ${tredeCellClass(step.neeTredeNum)}`}>
          <div className="font-bold">{step.neeTredeLabel}</div>
          <div className="mt-0.5 whitespace-pre-line font-normal text-neutral-900">{step.neeTredeBody}</div>
        </td>
        <td className="bg-white px-1 py-1 align-top whitespace-pre-line">
          {String(step.doelUren || '').trim() ? step.doelUren : '—'}
        </td>
        <td className="bg-white px-1 py-1 align-top">
          {step.werkboeken.map((w, wi) => (
            <div key={wi} className="break-words pb-0.5 last:pb-0">
              • {w}
            </div>
          ))}
        </td>
        <td className="bg-white px-1 py-1 align-top">
          {bijlage3DoelChecksPrint(step.doelJa, step.doelNee)}
        </td>
      </tr>
      <tr>
        <td colSpan={6} className="bg-white px-1.5 py-0.5 align-top">
          <div className="font-bold text-[#2d8f82]">JA &gt;</div>
        </td>
      </tr>
    </tbody>
  );
}

/** Trede 6 data row(s) only — JA > for this branch appears on the preceding b3_step_7 colspan row only. */
function Bijlage3Trede6Tbody({ page2 }: { page2: { doelJa?: boolean; doelNee?: boolean } }) {
  const tredeCellClass = `${BIJLAGE2_TREDE_BADGE[BIJLAGE3_PAGE2.tredeNum]}`;

  return (
    <tbody data-b3-trede6-body>
      <tr>
        <td className="bg-white px-1.5 py-1 align-top">
          <div className="whitespace-pre-line font-bold text-neutral-900">{BIJLAGE3_PAGE2.focusLine}</div>
        </td>
        <td className="bg-white px-1 py-1 align-top text-center text-neutral-500">—</td>
        <td className={`px-1 py-1 align-top ${tredeCellClass}`}>
          <div className="font-bold">{BIJLAGE3_PAGE2.tredeLabel}</div>
          <div className="mt-0.5 whitespace-pre-line font-normal text-neutral-900">{BIJLAGE3_PAGE2.tredeBody}</div>
        </td>
        <td className="bg-white px-1 py-1 align-top whitespace-pre-line">
          {BIJLAGE3_PAGE2.doelUren}
        </td>
        <td className="bg-white px-1 py-1 align-top text-neutral-500">—</td>
        <td className="bg-white px-1 py-1 align-top">
          {bijlage3DoelChecksPrint(page2.doelJa, page2.doelNee)}
        </td>
      </tr>
    </tbody>
  );
}

function Bijlage3StroomTable({
  decisions,
  showThead = true,
  trede6Page2,
}: {
  decisions: VGRBijlage3Decision[];
  showThead?: boolean;
  /** When set, Trede 6 rows are appended in the same table (no duplicate header). */
  trede6Page2?: { doelJa?: boolean; doelNee?: boolean } | null;
}) {
  return (
    <table className={BIJLAGE3_TABLE_SHELL_CLASS}>
      <Bijlage3TableColGroup />
      {showThead ? <Bijlage3TableThead /> : null}
      {decisions.map((step) => (
        <Bijlage3StepTbody key={step.id} step={step} />
      ))}
      {trede6Page2 ? <Bijlage3Trede6Tbody page2={trede6Page2} /> : null}
    </table>
  );
}

/** Fallback chrome if measurement nodes are missing (aligned with historical fixed estimates). */
const BIJLAGE3_TITLE_BLOCK_FALLBACK_PX = 52;
const BIJLAGE3_FOOTER_BLOCK_FALLBACK_PX = 78;
/** Matches `pb-8` on {@link TP2026_A4_PAGE_CLASS}. */
const BIJLAGE3_PAGE_BOTTOM_PAD_PX = 32;
const BIJLAGE3_LAYOUT_SAFETY_PX = 22;

type Bijlage3PackResult = { chunks: VGRBijlage3Decision[][] };

function bijlage3StepHeightOf(id: string, stepHeights: Record<string, number>): number {
  const fallbackStep = 96;
  const h = stepHeights[id];
  return typeof h === 'number' && h > 0 ? h : fallbackStep;
}

function bijlage3ChunksEqual(a: VGRBijlage3Decision[][], b: VGRBijlage3Decision[][]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (!ai || !bi || ai.length !== bi.length) return false;
    for (let j = 0; j < ai.length; j++) {
      if (ai[j].id !== bi[j].id) return false;
    }
  }
  return true;
}

function computeBijlage3PackingFromMeasurements(
  decisions: VGRBijlage3Decision[],
  usableFirstPx: number,
  usableContPx: number,
  stepHeights: Record<string, number>
): Bijlage3PackResult {
  if (!decisions.length) {
    return { chunks: [[]] };
  }

  const usableFirst = Math.max(120, usableFirstPx);
  const usableCont = Math.max(120, usableContPx);

  const splitIdx = decisions.findIndex((d) => d.id === BIJLAGE3_STEP_7_ID);
  const earlySteps = splitIdx >= 0 ? decisions.slice(0, splitIdx) : decisions;
  const lateSteps = splitIdx >= 0 ? decisions.slice(splitIdx) : [];

  const packSegment = (segment: VGRBijlage3Decision[]): VGRBijlage3Decision[][] => {
    if (!segment.length) return [];
    const out: VGRBijlage3Decision[][] = [];
    let cur: VGRBijlage3Decision[] = [];
    let used = 0;
    let budget = usableFirst;
    for (const step of segment) {
      const h = bijlage3StepHeightOf(step.id, stepHeights);
      if (cur.length > 0 && used + h > budget) {
        out.push(cur);
        cur = [];
        used = 0;
        budget = usableCont;
      }
      cur.push(step);
      used += h;
    }
    if (cur.length) out.push(cur);
    return out;
  };

  const earlyChunks = packSegment(earlySteps);
  const chunks =
    lateSteps.length > 0 ? [...earlyChunks, lateSteps] : earlyChunks.length ? earlyChunks : [[]];

  return { chunks };
}

function normalizeBijlage3EditorText(text?: string): string {
  return String(text || '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function truncateBijlage3Summary(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trim()}…`;
}

function bijlage3DoelStatusLabel(doelJa?: boolean, doelNee?: boolean): string | null {
  if (doelJa) return 'ja';
  if (doelNee) return 'nee';
  return null;
}

function Bijlage3DoelToggle({
  doelJa,
  doelNee,
  onSelectJa,
  onSelectNee,
}: {
  doelJa?: boolean;
  doelNee?: boolean;
  onSelectJa: (checked: boolean) => void;
  onSelectNee: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={Boolean(doelJa)}
        aria-label="Doel behaald: ja"
        title="Doel behaald: ja"
        onClick={() => onSelectJa(!doelJa)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition',
          doelJa
            ? 'border-green-500 bg-green-50 text-green-800'
            : 'border-border bg-white text-foreground hover:bg-muted/50'
        )}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        ja
      </button>
      <button
        type="button"
        aria-pressed={Boolean(doelNee)}
        aria-label="Doel behaald: nee"
        title="Doel behaald: nee"
        onClick={() => onSelectNee(!doelNee)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition',
          doelNee
            ? 'border-red-300 bg-red-50 text-red-800'
            : 'border-border bg-white text-foreground hover:bg-muted/50'
        )}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        nee
      </button>
    </div>
  );
}

export function Bijlage3Editor({
  decisions,
  setDecisions,
  page2,
  setPage2,
}: {
  decisions: VGRBijlage3Decision[];
  setDecisions: (next: VGRBijlage3Decision[]) => void;
  page2: { doelJa?: boolean; doelNee?: boolean };
  setPage2: (next: { doelJa?: boolean; doelNee?: boolean }) => void;
}) {
  const p2 = page2 || {};

  return (
    <div className="space-y-3">
      {decisions.map((decision, idx) => {
        const question = normalizeBijlage3EditorText(decision.question);
        const hint = decision.hint ? normalizeBijlage3EditorText(decision.hint) : '';
        const status = bijlage3DoelStatusLabel(decision.doelJa, decision.doelNee);

        return (
          <details
            key={decision.id}
            className={BIJLAGE_EDITOR_DETAILS_CLASS}
            open={idx === 0}
          >
            <summary className={BIJLAGE_EDITOR_SUMMARY_CLASS}>
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
              <span className="min-w-0 flex-1 text-left">
                <span className="mr-2 shrink-0">Stap {idx + 1}</span>
                <span className="font-normal text-neutral-700">{truncateBijlage3Summary(question)}</span>
              </span>
              {status ? (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                    status === 'ja'
                      ? 'bg-green-50 text-green-800 ring-green-200'
                      : 'bg-red-50 text-red-800 ring-red-200'
                  )}
                >
                  {status}
                </span>
              ) : null}
            </summary>
            <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
              <p className="text-sm font-semibold leading-snug text-[#6d2a96]">{question}</p>
              {hint ? <p className="text-xs leading-snug text-neutral-700">{hint}</p> : null}
              <div className="border-t border-border pt-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Doel behaald</p>
                <Bijlage3DoelToggle
                  doelJa={decision.doelJa}
                  doelNee={decision.doelNee}
                  onSelectJa={(checked) =>
                    setDecisions(
                      decisions.map((d, i) =>
                        i === idx
                          ? {
                              ...d,
                              doelJa: checked,
                              doelNee: checked ? false : Boolean(d.doelNee),
                            }
                          : d
                      )
                    )
                  }
                  onSelectNee={(checked) =>
                    setDecisions(
                      decisions.map((d, i) =>
                        i === idx
                          ? {
                              ...d,
                              doelNee: checked,
                              doelJa: checked ? false : Boolean(d.doelJa),
                            }
                          : d
                      )
                    )
                  }
                />
              </div>
            </div>
          </details>
        );
      })}

      <details className={BIJLAGE_EDITOR_DETAILS_CLASS}>
        <summary className={BIJLAGE_EDITOR_SUMMARY_CLASS}>
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
          <span className="min-w-0 flex-1 text-left">Laatste stap (pagina 2) — doel behaald</span>
          {bijlage3DoelStatusLabel(p2.doelJa, p2.doelNee) ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                p2.doelJa
                  ? 'bg-green-50 text-green-800 ring-green-200'
                  : 'bg-red-50 text-red-800 ring-red-200'
              )}
            >
              {bijlage3DoelStatusLabel(p2.doelJa, p2.doelNee)}
            </span>
          ) : null}
        </summary>
        <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
          <p className="text-xs leading-snug text-muted-foreground">
            {normalizeBijlage3EditorText(`${BIJLAGE3_PAGE2.jaLeadIn} ${BIJLAGE3_PAGE2.focusLine}`)}
          </p>
          <Bijlage3DoelToggle
            doelJa={p2.doelJa}
            doelNee={p2.doelNee}
            onSelectJa={(checked) =>
              setPage2({ ...p2, doelJa: checked, doelNee: checked ? false : p2.doelNee })
            }
            onSelectNee={(checked) =>
              setPage2({ ...p2, doelNee: checked, doelJa: checked ? false : p2.doelJa })
            }
          />
        </div>
      </details>
    </div>
  );
}

export function Bijlage3A4Pages({
  data,
  decisions,
  page2,
  printMode = false,
}: {
  data: Record<string, any>;
  decisions: VGRBijlage3Decision[];
  page2?: { doelJa?: boolean; doelNee?: boolean };
  printMode?: boolean;
}) {
  const { getPageNumber, setSectionPageCount } = useVGRPageNumber();
  const p2 = page2 || { doelJa: false, doelNee: false };
  const pageShellClass = `${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`;

  const measureMountRef = useRef<HTMLDivElement>(null);
  const mainPageBodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const refineIterationsRef = useRef(0);
  const [pack, setPack] = useState<Bijlage3PackResult>(() => ({
    chunks: decisions.length ? [decisions] : [[]],
  }));

  useLayoutEffect(() => {
    refineIterationsRef.current = 0;
  }, [decisions, data.date_of_birth, data.first_name, data.last_name, p2.doelJa, p2.doelNee]);

  useLayoutEffect(() => {
    const root = measureMountRef.current;
    if (!root) return;

    const mainTable = root.querySelector<HTMLTableElement>('[data-b3-measure-main-table]');
    const firstStack = root.querySelector<HTMLElement>('[data-b3-measure-first-stack]');
    const contStack = root.querySelector<HTMLElement>('[data-b3-measure-cont-stack]');
    const footerEl = root.querySelector<HTMLElement>('[data-b3-measure-footer]');

    const theadEl = mainTable?.querySelector('thead');
    const theadPx = theadEl?.offsetHeight ?? 0;

    const firstTbody = mainTable?.querySelector('tbody');
    let firstAbovePx = 0;
    if (firstStack && firstTbody) {
      firstAbovePx = Math.ceil(
        firstTbody.getBoundingClientRect().top - firstStack.getBoundingClientRect().top
      );
    } else if (firstStack && mainTable) {
      const thead = mainTable.querySelector('thead');
      if (thead) {
        firstAbovePx = Math.ceil(
          thead.getBoundingClientRect().bottom - firstStack.getBoundingClientRect().top
        );
      }
    }
    if (!firstAbovePx) {
      firstAbovePx =
        TP2026_BODY_FLOW_START_SPACER_PX +
        BIJLAGE3_TITLE_BLOCK_FALLBACK_PX +
        theadPx;
    }

    const contFirstTbody = contStack?.querySelector('tbody');
    let contAbovePx = 0;
    if (contStack && contFirstTbody) {
      contAbovePx = Math.ceil(
        contFirstTbody.getBoundingClientRect().top - contStack.getBoundingClientRect().top
      );
    }
    if (!contAbovePx) {
      contAbovePx = TP2026_BODY_FLOW_START_SPACER_PX;
    }

    const footerPx = footerEl?.offsetHeight ?? BIJLAGE3_FOOTER_BLOCK_FALLBACK_PX;

    const bottomReserve = BIJLAGE3_PAGE_BOTTOM_PAD_PX + BIJLAGE3_LAYOUT_SAFETY_PX;
    const usableFirstPx = A4_H - firstAbovePx - footerPx - bottomReserve;
    const usableContPx = A4_H - contAbovePx - footerPx - bottomReserve;

    const stepHeights: Record<string, number> = {};
    if (mainTable) {
      for (const step of decisions) {
        const tb = mainTable.querySelector<HTMLTableSectionElement>(
          `tbody[data-b3-step-id="${step.id.replace(/"/g, '\\"')}"]`
        );
        if (tb) stepHeights[step.id] = tb.offsetHeight;
      }
    }

    setPack((prev) => {
      const next = computeBijlage3PackingFromMeasurements(
        decisions,
        usableFirstPx,
        usableContPx,
        stepHeights
      );
      if (bijlage3ChunksEqual(prev.chunks, next.chunks)) {
        return prev;
      }
      return next;
    });
  }, [decisions, data.date_of_birth, data.first_name, data.last_name, p2.doelJa, p2.doelNee]);

  useLayoutEffect(() => {
    if (!decisions.length) return;

    const { chunks } = pack;
    if (!chunks.length) return;

    const maxPasses = decisions.length + chunks.length + 10;
    if (refineIterationsRef.current >= maxPasses) return;

    const tol = 4;
    for (let i = 0; i < chunks.length; i++) {
      const el = mainPageBodyRefs.current[i];
      if (!el) continue;
      if (el.scrollHeight <= el.clientHeight + tol) continue;

      const chunk = chunks[i];
      if (!chunk?.length) continue;

      if (chunk.length > 1) {
        refineIterationsRef.current += 1;
        setPack((prev) => {
          const nextChunks = prev.chunks.map((c) => [...c]);
          const ch = nextChunks[i];
          if (!ch || ch.length <= 1) return prev;
          const moved = ch.pop()!;
          const nextChunk = nextChunks[i + 1];
          const nextStartsStep7 = nextChunk?.[0]?.id === BIJLAGE3_STEP_7_ID;
          if (nextStartsStep7) {
            nextChunks.splice(i + 1, 0, [moved]);
          } else if (nextChunk) {
            nextChunk.unshift(moved);
          } else {
            nextChunks.push([moved]);
          }

          return { chunks: nextChunks };
        });
        return;
      }

      return;
    }
  }, [pack, decisions.length]);

  const { chunks: mainChunks } = pack;
  mainPageBodyRefs.current.length = mainChunks.length;

  useEffect(() => {
    setSectionPageCount('bijlage3', mainChunks.length);
  }, [mainChunks.length, setSectionPageCount]);

  const mainPages = mainChunks.map((chunk, idx) => {
    const isLast = idx === mainChunks.length - 1;

    return (
      <A4Page key={`b3-main-${idx}`} className={pageShellClass}>
        <div
          ref={(el) => {
            mainPageBodyRefs.current[idx] = el;
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <A4LogoHeader />
          {idx === 0 ? <Bijlage3TitleBlock /> : null}
          <Bijlage3StroomTable
            decisions={chunk}
            showThead={idx === 0}
            trede6Page2={isLast ? p2 : null}
          />
        </div>
        <FooterIdentity
          lastName={data.last_name}
          firstName={data.first_name}
          dateOfBirth={formatNLDate(data.date_of_birth)}
          pageNumber={getPageNumber('bijlage3', idx)}
        />
      </A4Page>
    );
  });

  const measureLayer = (
    <div
      ref={measureMountRef}
      className="pointer-events-none fixed left-0 top-0 -z-[100] opacity-0 overflow-hidden"
      style={{ width: A4_W }}
      aria-hidden
    >
      <div
        className="px-24 font-[family-name:var(--font-montserrat),Montserrat,system-ui,sans-serif]"
        style={{ width: A4_W }}
      >
        {/* Same stacking as page 1; chrome-to-first-row height uses first tbody top vs this stack. */}
        <div data-b3-measure-first-stack className="flex shrink-0 flex-col">
          <A4LogoHeader />
          <Bijlage3TitleBlock />
          <table data-b3-measure-main-table className={BIJLAGE3_TABLE_SHELL_CLASS}>
            <Bijlage3TableColGroup />
            <Bijlage3TableThead />
            {decisions.map((step) => (
              <Bijlage3StepTbody key={`m-${step.id}`} step={step} />
            ))}
          </table>
        </div>
        {/* Continuation pages: logo + table without thead (matches rendered chunk pages). */}
        <div data-b3-measure-cont-stack className="flex shrink-0 flex-col">
          <A4LogoHeader />
          <table className={BIJLAGE3_TABLE_SHELL_CLASS}>
            <Bijlage3TableColGroup />
            <tbody aria-hidden>
              <tr>
                <td
                  colSpan={6}
                  className="h-0 max-h-0 p-0 leading-none text-[0]"
                >
                  &#8203;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div data-b3-measure-footer>
          <FooterIdentity
            lastName={data.last_name}
            firstName={data.first_name}
            dateOfBirth={formatNLDate(data.date_of_birth)}
            pageNumber={1}
          />
        </div>
      </div>
    </div>
  );

  if (printMode) {
    return (
      <>
        {measureLayer}
        {mainPages.map((node, i) => (
          <section className="print-page" key={`print-b3-main-${i}`}>
            {node}
          </section>
        ))}
      </>
    );
  }

  return (
    <>
      {measureLayer}
      {mainPages}
    </>
  );
}

