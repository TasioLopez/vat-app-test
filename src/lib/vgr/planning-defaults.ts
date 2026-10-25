/**
 * Bijlage 1 (document 04) — "Voortgang en planning".
 * Labels match the blank ValentineZ appendix exactly. All statuses default to `P`
 * (template value) and must be reviewed by the adviser.
 */
import type { VGRPlanningActivity, VGRPlanningPhase, VGRPlanningStatus } from '@/lib/vgr/schema';
import { VGR_PLANNING_STATUSES } from '@/lib/vgr/schema';
import { computeBijlage1PhaseDateSlots } from '@/lib/tp2026/bijlage1-dates';

export type VGRPlanningPhaseDef = { id: string; goal: string; activities: string[] };

export const VGR_PLANNING_PHASE_DEFS: VGRPlanningPhaseDef[] = [
  {
    id: 'fase1',
    goal: 'Oriëntatie',
    activities: [
      'Verwerking verlies en acceptatie',
      'Empowerment',
      'Kwaliteiten en vaardigheden onderzoeken',
      'Webinars',
      'Beroeps-en arbeidsmarkt oriëntatie',
      'Scholingsmogelijkheden onderzoeken',
      'Sollicitatietools (brief en cv)',
      'Voortgangsrapportage en evaluatie',
      'Netwerken',
    ],
  },
  {
    id: 'fase2',
    goal: 'Activering',
    activities: [
      'Sollicitatievaardigheden vervolg (gesprek)',
      'Webinars',
      'Solliciteren via Social Media en/of netwerken',
      'Vacatures zoeken en beoordeling',
      'Wekelijks solliciteren',
      'Voortgangsrapportage en evaluatie',
    ],
  },
  {
    id: 'fase3',
    goal: 'Betaald werk',
    activities: [
      'Wekelijks solliciteren vervolg',
      'Sollicitatiegesprek voorbereiden en presenteren',
      'Jobhunten en bemiddeling',
      'Detachering onderzoeken',
      'Activering / werkervaring',
      'Webinar (gericht op eventuele WIA-aanvraag)',
      'Voortgangsrapportage en eindevaluatie',
      'Begeleiding WIA',
    ],
  },
];

/** Flat library of all official activity labels (for the "add activity" picker). */
export const VGR_PLANNING_ACTIVITY_LIBRARY: string[] = Array.from(
  new Set(VGR_PLANNING_PHASE_DEFS.flatMap((p) => p.activities))
);

/** TP Bijlage1 label → VGR 04 label (wording drift between the two templates). */
const TP_TO_VGR_ACTIVITY_LABEL: Record<string, string> = {
  'Kwaliteiten en vaardigheden onderzoek': 'Kwaliteiten en vaardigheden onderzoeken',
  'Beroeps-en arbeidsmarktoriëntatie': 'Beroeps-en arbeidsmarkt oriëntatie',
  'Solliciteren via Social Media': 'Solliciteren via Social Media en/of netwerken',
  'Activering/ werkervaringsplaats': 'Activering / werkervaring',
  Jobhunten: 'Jobhunten en bemiddeling',
  'Webinar, gericht op WIA-aanvraag': 'Webinar (gericht op eventuele WIA-aanvraag)',
};

export function normalizeVgrActivityLabel(label: string): string {
  const trimmed = String(label || '').trim().replace(/\s+/g, ' ');
  return TP_TO_VGR_ACTIVITY_LABEL[trimmed] ?? trimmed;
}

function activityId(phaseId: string, index: number): string {
  return `${phaseId}_a${index + 1}`;
}

export function createDefaultPlanningPhases(
  startDate?: string | null,
  endDate?: string | null
): VGRPlanningPhase[] {
  const slots =
    startDate && endDate ? computeBijlage1PhaseDateSlots(3, startDate, endDate) : [];
  return VGR_PLANNING_PHASE_DEFS.map((def, idx) => ({
    id: def.id,
    title: `Planning fase ${idx + 1}`,
    goal: def.goal,
    period_from: slots[idx]?.period_from ?? '',
    period_to: slots[idx]?.period_to ?? '',
    activities: def.activities.map((name, i) => ({
      id: activityId(def.id, i),
      name,
      status: 'P' as VGRPlanningStatus,
      note: '',
    })),
  }));
}

export function normalizePlanningStatus(value: unknown): VGRPlanningStatus {
  const s = String(value || '').toUpperCase() as VGRPlanningStatus;
  return VGR_PLANNING_STATUSES.includes(s) ? s : 'P';
}

/**
 * Convert TP 2026 `bijlage1_phases` into VGR planning phases.
 * Keeps the adviser's statuses/periods but normalizes labels to the VGR 04 wording.
 * Returns null when the TP has no usable phases.
 */
export function planningFromTpBijlage1(
  tpPhases: unknown,
  startDate?: string | null,
  endDate?: string | null
): VGRPlanningPhase[] | null {
  if (!Array.isArray(tpPhases) || tpPhases.length === 0) return null;
  const defaults = createDefaultPlanningPhases(startDate, endDate);
  const out: VGRPlanningPhase[] = [];
  tpPhases.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;
    const p = raw as Record<string, unknown>;
    const activities = Array.isArray(p.activities) ? (p.activities as Record<string, unknown>[]) : [];
    const def = defaults[idx];
    const id = def?.id ?? `fase${idx + 1}`;
    const acts: VGRPlanningActivity[] = activities
      .filter((a) => a && typeof a.name === 'string' && String(a.name).trim())
      .map((a, i) => ({
        id: activityId(id, i),
        name: normalizeVgrActivityLabel(String(a.name)),
        status: normalizePlanningStatus(a.status),
        note: '',
      }));
    out.push({
      id,
      title: `Planning fase ${idx + 1}`,
      goal: String(p.title || def?.goal || '').trim(),
      period_from: String(p.period_from || def?.period_from || ''),
      period_to: String(p.period_to || def?.period_to || ''),
      activities: acts.length ? acts : def?.activities ?? [],
    });
  });
  return out.length ? out : null;
}
