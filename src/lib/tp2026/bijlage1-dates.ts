import type { TP2026Bijlage1Phase } from '@/lib/tp2026/schema';
import { parseDateFlexible, toISODate } from '@/lib/tp2026/trajectory-dates';

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

/** Per-phase date slots for 2- or 3-phase traject splits (legacy Bijlage template rules). */
export function computeBijlage1PhaseDateSlots(
  phaseCount: number,
  startDate: string,
  endDate: string
): Array<{ period_from: string; period_to: string }> {
  const start = parseDateFlexible(startDate);
  const end = parseDateFlexible(endDate);
  if (!start || !end) return [];

  const phase1End = addMonths(start, 3);
  const phase2Start = phase1End;
  const phase2End = addMonths(phase2Start, 3);

  if (phaseCount <= 2) {
    return [
      { period_from: toISODate(start), period_to: toISODate(phase1End) },
      { period_from: toISODate(phase1End), period_to: toISODate(end) },
    ];
  }

  return [
    { period_from: toISODate(start), period_to: toISODate(phase1End) },
    { period_from: toISODate(phase2Start), period_to: toISODate(phase2End) },
    { period_from: toISODate(phase2End), period_to: toISODate(end) },
  ];
}

export function mergeBijlage1PhaseDatesFromLegacy(
  phases: TP2026Bijlage1Phase[],
  legacy: TP2026Bijlage1Phase[]
): TP2026Bijlage1Phase[] {
  if (legacy.length === 0) return phases;
  return phases.map((phase, i) => ({
    ...phase,
    period_from: phase.period_from || legacy[i]?.period_from || '',
    period_to: phase.period_to || legacy[i]?.period_to || '',
  }));
}

/** Fill empty phase periods from tp_start_date / tp_end_date when no phase has dates yet. */
export function fillBijlage1DatesFromTrajectory(
  phases: TP2026Bijlage1Phase[],
  startDate?: string | null,
  endDate?: string | null
): TP2026Bijlage1Phase[] {
  const start = String(startDate || '').trim();
  const end = String(endDate || '').trim();
  if (!start || !end || phases.length === 0) return phases;

  const hasAnyDate = phases.some((p) => p.period_from || p.period_to);
  if (hasAnyDate) return phases;

  const slots = computeBijlage1PhaseDateSlots(phases.length, start, end);
  if (slots.length === 0) return phases;

  return phases.map((phase, i) => {
    const slot = slots[i];
    if (!slot) return phase;
    return { ...phase, period_from: slot.period_from, period_to: slot.period_to };
  });
}

export function resolveBijlage1PhaseDates(
  phases: TP2026Bijlage1Phase[],
  legacy: TP2026Bijlage1Phase[],
  startDate?: string | null,
  endDate?: string | null
): TP2026Bijlage1Phase[] {
  const withLegacy = mergeBijlage1PhaseDatesFromLegacy(phases, legacy);
  return fillBijlage1DatesFromTrajectory(
    withLegacy,
    startDate || undefined,
    endDate || undefined
  );
}
