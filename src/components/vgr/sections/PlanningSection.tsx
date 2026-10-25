'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from 'lucide-react';
import { A4LogoHeader, A4Page, FooterIdentity, TP2026_A4_PAGE_CLASS } from '@/components/tp2026/primitives';
import { TP2026_CELL_BG_WARM_CLASS, TP2026_HTML_TABLE_CLASS } from '@/lib/tp2026/tp2026-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { VGR_PLANNING_FOOTNOTE, VGR_PLANNING_LEGEND } from '@/lib/vgr/content';
import {
  VGR_PLANNING_ACTIVITY_LIBRARY,
  createDefaultPlanningPhases,
} from '@/lib/vgr/planning-defaults';
import {
  VGR_PLANNING_STATUSES,
  newVgrId,
  type VGRData,
  type VGRPlanningActivity,
  type VGRPlanningPhase,
  type VGRPlanningStatus,
} from '@/lib/vgr/schema';

const STATUS_LABEL: Record<VGRPlanningStatus, string> = {
  G: 'G – gedaan / succesvol',
  P: 'P – nog in planning',
  N: 'N – niet gedaan / geen succes',
  U: 'U – in uitvoering',
};

const STATUS_CLASS: Record<VGRPlanningStatus, string> = {
  G: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  P: 'bg-white text-neutral-700 border-border',
  N: 'bg-rose-50 text-rose-800 border-rose-200',
  U: 'bg-amber-50 text-amber-800 border-amber-200',
};

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function PlanningEditor({
  phases,
  setPhases,
  planStartDate,
  planEndDate,
}: {
  phases: VGRPlanningPhase[];
  setPhases: (next: VGRPlanningPhase[]) => void;
  planStartDate?: string;
  planEndDate?: string;
}) {
  const [libraryPick, setLibraryPick] = useState<Record<string, string>>({});
  const used = useMemo(() => new Set(phases.flatMap((p) => p.activities.map((a) => a.name))), [phases]);
  const library = VGR_PLANNING_ACTIVITY_LIBRARY.filter((a) => !used.has(a));

  const updatePhase = (id: string, updater: (p: VGRPlanningPhase) => VGRPlanningPhase) =>
    setPhases(phases.map((p) => (p.id === id ? updater(p) : p)));

  const updateActivity = (phaseId: string, actId: string, patch: Partial<VGRPlanningActivity>) =>
    updatePhase(phaseId, (p) => ({
      ...p,
      activities: p.activities.map((a) => (a.id === actId ? { ...a, ...patch } : a)),
    }));

  const moveActivity = (phaseId: string, idx: number, dir: -1 | 1) =>
    updatePhase(phaseId, (p) => {
      const next = [...p.activities];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...p, activities: next };
    });

  const addActivity = (phaseId: string, name: string) =>
    updatePhase(phaseId, (p) => ({
      ...p,
      activities: [...p.activities, { id: newVgrId(`${phaseId}_a`), name, status: 'P', note: '' }],
    }));

  const addPhase = () =>
    setPhases([
      ...phases,
      {
        id: newVgrId('fase'),
        title: `Planning fase ${phases.length + 1}`,
        goal: '',
        period_from: '',
        period_to: '',
        activities: [],
      },
    ]);

  const resetToTemplate = () => setPhases(createDefaultPlanningPhases(planStartDate, planEndDate));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 p-3">
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={resetToTemplate}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Sjabloon (3 fases) herstellen
        </Button>
        <Button type="button" size="sm" className="gap-1" onClick={addPhase}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Fase toevoegen
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Werk per activiteit de status bij voor deze rapportageperiode. Statussen uit het trajectplan of de vorige
          rapportage zijn overgenomen. Een korte notitie is optioneel en wordt niet afgedrukt.
        </p>
      </div>

      {phases.map((phase, phaseIdx) => (
        <div key={phase.id} className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-[#702A90]">Planning fase {phaseIdx + 1}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPhases(phases.filter((p) => p.id !== phase.id))}
            >
              Verwijder fase
            </Button>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Doel</label>
                <Input value={phase.goal} onChange={(e) => updatePhase(phase.id, (p) => ({ ...p, goal: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Periode van</label>
                <Input
                  type="date"
                  value={phase.period_from}
                  onChange={(e) => updatePhase(phase.id, (p) => ({ ...p, period_from: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Periode tot</label>
                <Input
                  type="date"
                  value={phase.period_to}
                  onChange={(e) => updatePhase(phase.id, (p) => ({ ...p, period_to: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {phase.activities.map((a, idx) => (
                <div key={a.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-2 rounded-md border px-2 py-1.5">
                  <div className="min-w-0 space-y-1">
                    <Input
                      className="h-8 text-sm"
                      value={a.name}
                      onChange={(e) => updateActivity(phase.id, a.id, { name: e.target.value })}
                      placeholder="Activiteit…"
                    />
                    <Input
                      className="h-7 text-xs"
                      value={a.note}
                      onChange={(e) => updateActivity(phase.id, a.id, { note: e.target.value })}
                      placeholder="Notitie (niet afgedrukt)"
                    />
                  </div>
                  <div className="flex gap-1" role="radiogroup" aria-label="Status">
                    {VGR_PLANNING_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        title={STATUS_LABEL[s]}
                        aria-pressed={a.status === s}
                        onClick={() => updateActivity(phase.id, a.id, { status: s })}
                        className={`h-8 w-8 rounded border text-sm font-bold transition-colors ${
                          a.status === s ? `${STATUS_CLASS[s]} ring-2 ring-[#702A90]/40` : 'border-border bg-white text-neutral-400 hover:bg-muted'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      disabled={idx === 0}
                      aria-label="Omhoog"
                      onClick={() => moveActivity(phase.id, idx, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      disabled={idx === phase.activities.length - 1}
                      aria-label="Omlaag"
                      onClick={() => moveActivity(phase.id, idx, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
                      aria-label="Verwijderen"
                      onClick={() =>
                        updatePhase(phase.id, (p) => ({ ...p, activities: p.activities.filter((x) => x.id !== a.id) }))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 min-w-[220px] flex-1 rounded border border-border px-2 text-sm"
                value={libraryPick[phase.id] || ''}
                onChange={(e) => setLibraryPick((prev) => ({ ...prev, [phase.id]: e.target.value }))}
              >
                <option value="">Activiteit uit sjabloon…</option>
                {library.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!libraryPick[phase.id]}
                onClick={() => {
                  addActivity(phase.id, libraryPick[phase.id]);
                  setLibraryPick((prev) => ({ ...prev, [phase.id]: '' }));
                }}
              >
                Toevoegen
              </Button>
              <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => addActivity(phase.id, '')}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Eigen activiteit
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A4                                                                  */
/* ------------------------------------------------------------------ */

const LABEL_BG = TP2026_CELL_BG_WARM_CLASS;
/** Rows (header + doel + periode + activities) that fit on one A4 at 10pt. */
const MAX_ROWS_PER_PAGE = 40;

function paginatePhases(phases: VGRPlanningPhase[]): VGRPlanningPhase[][] {
  const pages: VGRPlanningPhase[][] = [];
  let current: VGRPlanningPhase[] = [];
  let rows = 0;
  for (const p of phases) {
    const needed = 3 + Math.max(1, p.activities.length);
    if (current.length > 0 && rows + needed > MAX_ROWS_PER_PAGE) {
      pages.push(current);
      current = [];
      rows = 0;
    }
    current.push(p);
    rows += needed;
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);
  return pages;
}

function PhaseTable({ phase, index }: { phase: VGRPlanningPhase; index: number }) {
  const periode = `Van ${formatNLDateForDoc(phase.period_from)} tot ${formatNLDateForDoc(phase.period_to)}`;
  const rows = phase.activities.length ? phase.activities : [{ id: 'empty', name: '—', status: 'P' as const, note: '' }];
  return (
    <table className={`${TP2026_HTML_TABLE_CLASS} bg-white`}>
      <colgroup>
        <col style={{ width: '22%' }} />
        <col style={{ width: '68%' }} />
        <col style={{ width: '10%' }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={2} className="!bg-white px-2 py-0.5 font-bold text-[#702A90]">
            Planning fase {index + 1}
          </td>
          <td className="!bg-white px-2 py-0.5 text-center font-bold text-[#702A90]">Status</td>
        </tr>
        <tr>
          <td className={`px-2 py-0.5 align-top font-bold text-[#702A90] ${LABEL_BG}`}>Doel</td>
          <td className="!bg-white px-2 py-0.5 align-top font-bold text-[#702A90]" colSpan={2}>
            {phase.goal || '—'}
          </td>
        </tr>
        <tr>
          <td className={`px-2 py-0.5 align-top font-bold text-[#702A90] ${LABEL_BG}`}>Periode</td>
          <td className="!bg-white px-2 py-0.5 align-top font-bold text-[#2d8f82]" colSpan={2}>
            {periode}
          </td>
        </tr>
        {rows.map((a, rowIdx) => (
          <tr key={a.id}>
            {rowIdx === 0 ? (
              <td rowSpan={rows.length} className={`px-2 py-0.5 align-top font-bold text-[#702A90] ${LABEL_BG}`}>
                Activiteiten
              </td>
            ) : null}
            <td className="!bg-white px-2 py-0.5 align-top text-neutral-900">{a.name || '—'}</td>
            <td className="!bg-white px-2 py-0.5 text-center align-top font-bold text-neutral-900">{a.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PlanningA4Pages({ data, printMode = false }: { data: VGRData; printMode?: boolean }) {
  const { getPageNumber, setSectionPageCount } = useVGRPageNumber();
  const pages = useMemo(() => paginatePhases(data.planning_phases), [data.planning_phases]);

  useEffect(() => {
    setSectionPageCount('planning', pages.length);
  }, [pages.length, setSectionPageCount]);

  let phaseOffset = 0;
  return (
    <>
      {pages.map((phases, pageIdx) => {
        const startIdx = phaseOffset;
        phaseOffset += phases.length;
        const isLast = pageIdx === pages.length - 1;
        const page = (
          <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <A4LogoHeader />
              {pageIdx === 0 ? (
                <div className="mb-1 shrink-0">
                  <div className="text-[11pt] font-bold leading-tight tracking-tight text-[#d4694a]">Bijlage 1</div>
                  <div className="mt-0.5 text-[10pt] font-bold leading-tight tracking-tight text-[#2d8f82]">
                    Voortgang en planning
                  </div>
                </div>
              ) : null}
              <div className="shrink-0 space-y-2 text-[10pt] leading-snug text-neutral-900">
                {phases.map((phase, i) => (
                  <PhaseTable key={phase.id} phase={phase} index={startIdx + i} />
                ))}
              </div>
              {isLast ? (
                <div className="mt-1.5 shrink-0 pb-1">
                  <p className="text-[8pt] italic leading-tight text-[#702A90]">{VGR_PLANNING_FOOTNOTE}</p>
                  <p className="text-[9pt] leading-tight">
                    {VGR_PLANNING_LEGEND.map(([code, label], i) => (
                      <span key={code}>
                        <span className="font-bold text-[#702A90]">{code}</span> {label}
                        {i < VGR_PLANNING_LEGEND.length - 1 ? ' - ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              ) : null}
            </div>
            <FooterIdentity
              lastName={data.last_name}
              firstName={data.first_name}
              dateOfBirth={formatNLDateForDoc(data.date_of_birth)}
              pageNumber={getPageNumber('planning', pageIdx)}
            />
          </A4Page>
        );
        return printMode ? (
          <section className="print-page" key={pageIdx}>
            {page}
          </section>
        ) : (
          <div key={pageIdx}>{page}</div>
        );
      })}
    </>
  );
}
