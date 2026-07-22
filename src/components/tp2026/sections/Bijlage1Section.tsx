'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  A4LogoHeader,
  A4Page,
  FooterIdentity,
  TP2026_A4_PAGE_CLASS,
} from '@/components/tp2026/primitives';
import type { TP2026Bijlage1Activity, TP2026Bijlage1Phase } from '@/lib/tp2026/schema';
import { formatNLDate } from '@/lib/tp2026/schema';
import { computeBijlage1PhaseDateSlots } from '@/lib/tp2026/bijlage1-dates';
import { parseDateFlexible, toISODate } from '@/lib/tp2026/trajectory-dates';
import {
  TP2026_CELL_BG_WARM_CLASS,
  TP2026_HTML_TABLE_CLASS,
} from '@/lib/tp2026/tp2026-colors';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTP2026PageNumber } from '@/context/TP2026PageNumberContext';
import { BIJLAGE1_PAGE_COUNT } from '@/lib/tp2026/page-numbering';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, GripVertical, Plus, X } from 'lucide-react';

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="w-full border border-border rounded px-2 py-1 text-sm"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

const STATUS_OPTIONS: TP2026Bijlage1Activity['status'][] = ['G', 'P', 'N', 'U'];
const ACTIVITY_LIBRARY = [
  'Verwerking verlies en acceptatie',
  'Empowerment',
  'Webinars',
  'Kwaliteiten en vaardigheden onderzoek',
  'Beroeps-en arbeidsmarktoriëntatie',
  'Scholingsmogelijkheden onderzoeken',
  'Sollicitatietools (brief en cv)',
  'Voortgangsrapportage en evaluatie',
  'Sollicitatievaardigheden vervolg (gesprek)',
  'Netwerken',
  'Solliciteren via Social Media',
  'Vacatures zoeken en beoordeling',
  'Wekelijks solliciteren',
  'Activering/ werkervaringsplaats',
  'Wekelijks solliciteren vervolg',
  'Sollicitatiegesprek voorbereiden en presenteren',
  'Jobhunten',
  'Detachering onderzoeken',
  'Webinar, gericht op WIA-aanvraag',
  'Begeleiding WIA',
  'Voortgangsrapportage en eindevaluatie',
] as const;

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

function normalizePhase(phase: TP2026Bijlage1Phase, index: number): TP2026Bijlage1Phase {
  return {
    title: String(phase?.title || `Planning fase ${index + 1}`),
    period_from: String(phase?.period_from || ''),
    period_to: String(phase?.period_to || ''),
    activities: Array.isArray(phase?.activities)
      ? phase.activities
          .filter((activity) => activity && typeof activity.name === 'string')
          .map((activity) => ({
            name: activity.name,
            status: STATUS_OPTIONS.includes(activity.status) ? activity.status : 'P',
          }))
      : [],
  };
}

function createTemplates(startDate: string, endDate: string): Record<'2-fases' | '3-fases', TP2026Bijlage1Phase[]> {
  const start = parseDateFlexible(startDate);
  const end = parseDateFlexible(endDate);
  if (!start || !end) {
    return { '3-fases': [], '2-fases': [] };
  }
  const phase1End = addMonths(start, 3);
  const phase2Start = phase1End;
  const phase2End = addMonths(phase2Start, 3);
  const threePhaseDates = computeBijlage1PhaseDateSlots(3, startDate, endDate);
  const twoPhaseDates = computeBijlage1PhaseDateSlots(2, startDate, endDate);

  return {
    '3-fases': [
      {
        title: 'Oriëntatie',
        period_from: threePhaseDates[0]?.period_from ?? toISODate(start),
        period_to: threePhaseDates[0]?.period_to ?? toISODate(phase1End),
        activities: [
          'Verwerking verlies en acceptatie',
          'Empowerment',
          'Webinars',
          'Kwaliteiten en vaardigheden onderzoek',
          'Beroeps-en arbeidsmarktoriëntatie',
          'Scholingsmogelijkheden onderzoeken',
          'Sollicitatietools (brief en cv)',
          'Voortgangsrapportage en evaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
      {
        title: 'Activering',
        period_from: threePhaseDates[1]?.period_from ?? toISODate(phase2Start),
        period_to: threePhaseDates[1]?.period_to ?? toISODate(phase2End),
        activities: [
          'Sollicitatievaardigheden vervolg (gesprek)',
          'Netwerken',
          'Webinars',
          'Solliciteren via Social Media',
          'Vacatures zoeken en beoordeling',
          'Wekelijks solliciteren',
          'Activering/ werkervaringsplaats',
          'Voortgangsrapportage en evaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
      {
        title: 'Betaald werk',
        period_from: threePhaseDates[2]?.period_from ?? toISODate(phase2End),
        period_to: threePhaseDates[2]?.period_to ?? toISODate(end),
        activities: [
          'Wekelijks solliciteren vervolg',
          'Sollicitatiegesprek voorbereiden en presenteren',
          'Jobhunten',
          'Detachering onderzoeken',
          'Webinar, gericht op WIA-aanvraag',
          'Begeleiding WIA',
          'Voortgangsrapportage en eindevaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
    ],
    '2-fases': [
      {
        title: 'Oriëntatie',
        period_from: twoPhaseDates[0]?.period_from ?? toISODate(start),
        period_to: twoPhaseDates[0]?.period_to ?? toISODate(phase1End),
        activities: [
          'Verwerking verlies en acceptatie',
          'Empowerment',
          'Webinars',
          'Kwaliteiten en vaardigheden onderzoek',
          'Beroeps-en arbeidsmarktoriëntatie',
          'Scholingsmogelijkheden onderzoeken',
          'Sollicitatietools (brief en cv)',
          'Voortgangsrapportage en evaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
      {
        title: 'Activering/betaald werk',
        period_from: twoPhaseDates[1]?.period_from ?? toISODate(phase1End),
        period_to: twoPhaseDates[1]?.period_to ?? toISODate(end),
        activities: [
          'Sollicitatievaardigheden vervolg (gesprek)',
          'Netwerken',
          'Webinars',
          'Solliciteren via Social Media',
          'Vacatures zoeken en beoordeling',
          'Wekelijks solliciteren',
          'Activering/ werkervaringsplaats',
          'Sollicitatiegesprek voorbereiden en presenteren',
          'Jobhunten',
          'Detachering onderzoeken',
          'Webinar, gericht op WIA-aanvraag',
          'Begeleiding WIA',
          'Voortgangsrapportage en eindevaluatie',
        ].map((name) => ({ name, status: 'P' as const })),
      },
    ],
  };
}

function Bijlage1Draggable({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

function Bijlage1Droppable({
  id,
  children,
  className = '',
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-1 ring-[#6d2a96]/40' : ''}`}
    >
      {children}
    </div>
  );
}

function Bijlage1SortableActivityRow({
  id,
  children,
}: {
  id: string;
  children: (props: { dragHandleProps: Record<string, unknown> }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

type PhaseActivityRef = { phaseIdx: number; actIdx: number };

function phaseActivityId(phaseIdx: number, actIdx: number): string {
  return `fase-${phaseIdx}-act-${actIdx}`;
}

function parsePhaseActivityId(id: string): PhaseActivityRef | null {
  const match = /^fase-(\d+)-act-(\d+)$/.exec(id);
  if (!match) return null;
  return { phaseIdx: Number(match[1]), actIdx: Number(match[2]) };
}

function isPhaseContainerId(id: string): boolean {
  return /^fase-\d+$/.test(id);
}

function resolveDropPhaseIndex(overId: string): number {
  if (overId === 'unassigned') return -1;
  const activityRef = parsePhaseActivityId(overId);
  if (activityRef) return activityRef.phaseIdx;
  if (isPhaseContainerId(overId)) return Number(overId.slice('fase-'.length));
  return -1;
}

function resolveDragLabel(dragId: string, phases: TP2026Bijlage1Phase[]): string {
  const ref = parsePhaseActivityId(dragId);
  if (!ref) return dragId;
  const name = phases[ref.phaseIdx]?.activities[ref.actIdx]?.name;
  return name?.trim() ? name : 'Activiteit';
}

export function Bijlage1Editor({
  phases,
  setPhases,
  planStartDate,
  planEndDate,
}: {
  phases: TP2026Bijlage1Phase[];
  setPhases: (next: TP2026Bijlage1Phase[]) => void;
  planStartDate?: string;
  planEndDate?: string;
}) {
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const normalized = useMemo(() => phases.map((phase, index) => normalizePhase(phase, index)), [phases]);
  const usedActivityNames = useMemo(
    () => new Set(normalized.flatMap((phase) => phase.activities.map((activity) => activity.name))),
    [normalized]
  );
  const unassigned = useMemo(
    () => ACTIVITY_LIBRARY.filter((activity) => !usedActivityNames.has(activity)),
    [usedActivityNames]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const updatePhase = (idx: number, updater: (prev: TP2026Bijlage1Phase) => TP2026Bijlage1Phase) => {
    setPhases(normalized.map((phase, i) => (i === idx ? updater(phase) : phase)));
  };

  const applyTemplate = (templateKey: '2-fases' | '3-fases') => {
    if (!planStartDate || !planEndDate) return;
    setPhases(createTemplates(planStartDate, planEndDate)[templateKey]);
    setActivePhaseIdx(0);
  };

  const addPhase = () => {
    setPhases([
      ...normalized,
      {
        title: `Planning fase ${normalized.length + 1}`,
        period_from: '',
        period_to: '',
        activities: [],
      },
    ]);
  };

  const removePhase = (index: number) => {
    const next = normalized.filter((_, phaseIdx) => phaseIdx !== index);
    setPhases(next.length > 0 ? next : [{ title: '', period_from: '', period_to: '', activities: [] }]);
    setActivePhaseIdx((current) => Math.max(0, Math.min(current, next.length - 1)));
  };

  const addActivityToActivePhase = (activityName: string) => {
    if (!normalized[activePhaseIdx]) return;
    updatePhase(activePhaseIdx, (phase) => ({
      ...phase,
      activities: [...phase.activities, { name: activityName, status: 'P' }],
    }));
  };

  const addCustomActivity = (phaseIdx: number) => {
    setActivePhaseIdx(phaseIdx);
    updatePhase(phaseIdx, (phase) => ({
      ...phase,
      activities: [...phase.activities, { name: '', status: 'P' }],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeRef = parsePhaseActivityId(activeId);
    const overRef = parsePhaseActivityId(overId);
    const toPhaseIdx = resolveDropPhaseIndex(overId);

    if (overId === 'unassigned') {
      if (!activeRef) return;
      const next = normalized.map((phase, idx) =>
        idx === activeRef.phaseIdx
          ? {
              ...phase,
              activities: phase.activities.filter((_, actIdx) => actIdx !== activeRef.actIdx),
            }
          : phase
      );
      setPhases(next);
      return;
    }

    if (activeRef && overRef && activeRef.phaseIdx === overRef.phaseIdx) {
      if (activeRef.actIdx === overRef.actIdx) return;
      const items = [...normalized[activeRef.phaseIdx].activities];
      const next = normalized.map((phase, idx) =>
        idx === activeRef.phaseIdx
          ? { ...phase, activities: arrayMove(items, activeRef.actIdx, overRef.actIdx) }
          : phase
      );
      setPhases(next);
      return;
    }

    // Same phase, dropped on container — no-op
    if (activeRef && toPhaseIdx === activeRef.phaseIdx && !overRef) return;

    if (!activeRef && toPhaseIdx !== -1) {
      const activityName = activeId;
      const next = normalized.map((phase, idx) => {
        if (idx !== toPhaseIdx) return phase;
        const activities = [...phase.activities];
        const newItem = { name: activityName, status: 'P' as const };
        if (overRef) {
          activities.splice(overRef.actIdx, 0, newItem);
        } else {
          activities.push(newItem);
        }
        return { ...phase, activities };
      });
      setPhases(next);
      return;
    }

    if (activeRef && toPhaseIdx !== -1 && activeRef.phaseIdx !== toPhaseIdx) {
      const moved = normalized[activeRef.phaseIdx]?.activities[activeRef.actIdx];
      if (!moved) return;
      const next = normalized.map((phase, idx) => {
        if (idx === activeRef.phaseIdx) {
          return {
            ...phase,
            activities: phase.activities.filter((_, actIdx) => actIdx !== activeRef.actIdx),
          };
        }
        if (idx === toPhaseIdx) {
          const activities = [...phase.activities];
          if (overRef) {
            activities.splice(overRef.actIdx, 0, moved);
          } else {
            activities.push(moved);
          }
          return { ...phase, activities };
        }
        return phase;
      });
      setPhases(next);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveDragId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="mb-2 text-sm font-semibold">Templates</div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyTemplate('3-fases')}
              disabled={!planStartDate || !planEndDate}
            >
              3 fases
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyTemplate('2-fases')}
              disabled={!planStartDate || !planEndDate}
            >
              2 fases
            </Button>
            <Button type="button" size="sm" className="gap-1" onClick={addPhase}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Fase toevoegen
            </Button>
          </div>
          {!planStartDate || !planEndDate ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Vul start- en einddatum in bij Gegevens om templates automatisch te vullen.
            </p>
          ) : null}
        </div>

        <div className="flex gap-4">
          {sidebarCollapsed ? (
            <div className="flex w-9 shrink-0 flex-col items-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Beschikbare activiteiten uitklappen"
                aria-expanded={false}
                onClick={() => setSidebarCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="min-w-[200px] max-w-[280px] shrink-0 rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Beschikbare activiteiten</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Beschikbare activiteiten inklappen"
                  aria-expanded={true}
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <Bijlage1Droppable id="unassigned" className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
                {unassigned.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Alle activiteiten zijn toegewezen.</p>
                ) : null}
                {unassigned.map((activity) => (
                  <Bijlage1Draggable key={activity} id={activity}>
                    <button
                      type="button"
                      className="w-full rounded border bg-white px-2 py-1 text-left text-xs hover:bg-muted"
                      onClick={() => addActivityToActivePhase(activity)}
                    >
                      {activity}
                    </button>
                  </Bijlage1Draggable>
                ))}
              </Bijlage1Droppable>
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-4">
            {normalized.map((phase, phaseIdx) => (
              <div
                key={phaseIdx}
                className={`rounded-md border p-3 ${activePhaseIdx === phaseIdx ? 'border-[#6d2a96]' : 'border-border'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="text-sm font-semibold text-left"
                    onClick={() => setActivePhaseIdx(phaseIdx)}
                  >
                    Planning fase {phaseIdx + 1}
                  </button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePhase(phaseIdx)}>
                    Verwijder
                  </Button>
                </div>
                <div className="space-y-2">
                  <TextInput
                    value={phase.title}
                    onChange={(v) => updatePhase(phaseIdx, (p) => ({ ...p, title: v }))}
                    placeholder="Doel"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full border border-border rounded px-2 py-1 text-sm"
                      value={phase.period_from || ''}
                      onChange={(e) => updatePhase(phaseIdx, (p) => ({ ...p, period_from: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="w-full border border-border rounded px-2 py-1 text-sm"
                      value={phase.period_to || ''}
                      onChange={(e) => updatePhase(phaseIdx, (p) => ({ ...p, period_to: e.target.value }))}
                    />
                  </div>
                </div>
                <Bijlage1Droppable
                  id={`fase-${phaseIdx}`}
                  className="mt-3 min-h-[40px] space-y-1 rounded-md border border-dashed border-border/60 p-1"
                >
                  <SortableContext
                    items={phase.activities.map((_, actIdx) => phaseActivityId(phaseIdx, actIdx))}
                    strategy={verticalListSortingStrategy}
                  >
                    {phase.activities.map((activity, actIdx) => {
                      const rowId = phaseActivityId(phaseIdx, actIdx);
                      return (
                      <Bijlage1SortableActivityRow key={rowId} id={rowId}>
                        {({ dragHandleProps }) => (
                          <div className="grid grid-cols-[auto_1fr_70px_56px] items-center gap-2">
                            <button
                              type="button"
                              className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                              aria-label="Sleep activiteit"
                              {...dragHandleProps}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <TextInput
                              value={activity.name}
                              onChange={(v) =>
                                updatePhase(phaseIdx, (p) => ({
                                  ...p,
                                  activities: p.activities.map((row, rowIdx) =>
                                    rowIdx === actIdx ? { ...row, name: v } : row
                                  ),
                                }))
                              }
                              placeholder="Activiteit…"
                            />
                            <select
                              className="border border-border rounded px-2 py-1 text-sm"
                              value={activity.status}
                              onChange={(e) =>
                                updatePhase(phaseIdx, (p) => ({
                                  ...p,
                                  activities: p.activities.map((row, rowIdx) =>
                                    rowIdx === actIdx
                                      ? { ...row, status: e.target.value as TP2026Bijlage1Activity['status'] }
                                      : row
                                  ),
                                }))
                              }
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updatePhase(phaseIdx, (p) => ({
                                  ...p,
                                  activities: p.activities.filter((_, rowIdx) => rowIdx !== actIdx),
                                }))
                              }
                            >
                              X
                            </Button>
                          </div>
                        )}
                      </Bijlage1SortableActivityRow>
                      );
                    })}
                  </SortableContext>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Activiteit toevoegen"
                    onClick={() => addCustomActivity(phaseIdx)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                </Bijlage1Droppable>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragId ? (
          <div className="rounded border bg-white px-2 py-1 text-xs shadow-md">
            {resolveDragLabel(activeDragId, normalized)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Left-column label cells (Doel / Periode / Activiteiten). */
const BIJLAGE1_LABEL_BG = TP2026_CELL_BG_WARM_CLASS;

export function Bijlage1A4Pages({
  data,
  phases,
  printMode = false,
}: {
  data: Record<string, any>;
  phases: TP2026Bijlage1Phase[];
  printMode?: boolean;
}) {
  const { getPageNumber, setSectionPageCount } = useTP2026PageNumber();

  useEffect(() => {
    setSectionPageCount('bijlage1', BIJLAGE1_PAGE_COUNT);
  }, [setSectionPageCount]);

  const normalized = phases.map((phase, index) => normalizePhase(phase, index));
  const renderPeriodeText = (phase: TP2026Bijlage1Phase) =>
    `Van ${formatNLDate(phase.period_from)} tot ${formatNLDate(phase.period_to)}`;

  const page = (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      {/* Scroll main body; footer stays pinned to bottom of A4 (avoids clipped fase 3 + stray gap). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <A4LogoHeader />
        <div className="mb-1 shrink-0">
          {/* Google Doc: "Bijlage 1" 11 pt; subtitle "Voortgang en planning" 10 pt (smaller). */}
          <div className="text-[11pt] leading-tight font-bold tracking-tight text-[#d4694a]">Bijlage 1</div>
          <div className="mt-0.5 text-[10pt] leading-tight font-bold tracking-tight text-[#2d8f82]">
            Voortgang en planning
          </div>
        </div>
        <div className="shrink-0 space-y-2 text-[10pt] leading-snug text-neutral-900">
          {normalized.map((phase, idx) => (
            <table key={idx} className={`${TP2026_HTML_TABLE_CLASS} bg-white`}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '68%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={2} className="!bg-white px-2 py-0.5 text-[#6d2a96] font-bold">
                    Planning fase {idx + 1}
                  </td>
                  <td className="!bg-white px-2 py-0.5 text-[#6d2a96] font-bold text-center">
                    Status
                  </td>
                </tr>
                <tr>
                  <td
                    className={`px-2 py-0.5 text-[#6d2a96] font-bold align-top ${BIJLAGE1_LABEL_BG}`}
                  >
                    Doel
                  </td>
                  <td className="!bg-white px-2 py-0.5 font-bold text-[#6d2a96] align-top" colSpan={2}>
                    {phase.title || '—'}
                  </td>
                </tr>
                <tr>
                  <td
                    className={`px-2 py-0.5 text-[#6d2a96] font-bold align-top ${BIJLAGE1_LABEL_BG}`}
                  >
                    Periode
                  </td>
                  <td className="!bg-white px-2 py-0.5 align-top font-bold text-[#2d8f82]" colSpan={2}>
                    {renderPeriodeText(phase)}
                  </td>
                </tr>
                {(phase.activities.length ? phase.activities : [{ name: '—', status: 'P' as const }]).map(
                  (activity, rowIdx, rows) => (
                    <tr key={`${idx}-${rowIdx}`}>
                      {rowIdx === 0 ? (
                        <td
                          rowSpan={rows.length}
                          className={`px-2 py-0.5 text-[#6d2a96] font-bold align-top ${BIJLAGE1_LABEL_BG}`}
                        >
                          Activiteiten
                        </td>
                      ) : null}
                      <td className="!bg-white px-2 py-0.5 align-top text-neutral-900">
                        {activity.name}
                      </td>
                      <td className="!bg-white px-2 py-0.5 text-center align-top font-bold text-neutral-900">
                        {activity.status}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          ))}
        </div>
        <div className="mt-1.5 shrink-0 pb-1">
          <p className="text-[8pt] leading-tight italic text-[#6d2a96]">
            * Het solliciteren geschiedt volgens planning, aanvang sollicitatiefase wordt vervroegd indien werknemer
            daar eerder klaar voor is.
          </p>
          <p className="text-[9pt] leading-tight">
            <span className="font-bold text-[#6d2a96]">G</span> gedaan / succesvol uitgevoerd -{' '}
            <span className="font-bold text-[#6d2a96]">P</span> nog in planning -{' '}
            <span className="font-bold text-[#6d2a96]">N</span> niet gedaan / geen succes -{' '}
            <span className="font-bold text-[#6d2a96]">U</span> in uitvoering
          </p>
        </div>
      </div>
      <FooterIdentity
        lastName={data.last_name}
        firstName={data.first_name}
        dateOfBirth={formatNLDate(data.date_of_birth)}
        pageNumber={getPageNumber('bijlage1', 0)}
      />
    </A4Page>
  );
  return printMode ? <section className="print-page">{page}</section> : page;
}

