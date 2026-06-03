/**
 * Derives Opdrachtinformatie fields (tp_end_date, tp_start_date, tp_lead_time)
 * from traject metadata — same rules as legacy EmployeeInfo.tsx.
 */

const TRAJECTORY_DURATION_YEARS = 2;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY */
export function parseDateFlexible(v: string): Date | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    return new Date(y, mo - 1, d);
  }
  const n = new Date(v);
  return Number.isNaN(+n) ? null : n;
}

function addYears(d: Date, years: number): Date {
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

function weekDiffCeil(a: Date, b: Date): number {
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 7)));
}

export type TrajectoryDateKey = 'tp_end_date' | 'tp_start_date' | 'tp_lead_time';

/** Returns fields that should be updated (empty object if nothing to change). */
export function getTrajectoryDateUpdates(
  data: Record<string, unknown>
): Partial<Record<TrajectoryDateKey, string>> {
  const updates: Partial<Record<TrajectoryDateKey, string>> = {};

  const fsdISO = data.first_sick_day;
  if (fsdISO) {
    const fsd = parseDateFlexible(String(fsdISO));
    if (fsd) {
      const endISO = toISODate(addYears(fsd, TRAJECTORY_DURATION_YEARS));
      if (data.tp_end_date !== endISO) updates.tp_end_date = endISO;
    }
  }

  const endISO = updates.tp_end_date ?? data.tp_end_date;
  const regISO = data.registration_date;
  const intakeISO = data.intake_date;

  if (regISO && intakeISO && endISO) {
    const regDate = parseDateFlexible(String(regISO));
    const endDate = parseDateFlexible(String(endISO));
    if (regDate && endDate) {
      const durationWeeks = weekDiffCeil(regDate, endDate);
      const startISO = durationWeeks >= 53 ? String(intakeISO) : String(regISO);
      if (data.tp_start_date !== startISO) updates.tp_start_date = startISO;
    }
  }

  const startISO = updates.tp_start_date ?? data.tp_start_date;
  const finalEndISO = updates.tp_end_date ?? data.tp_end_date;

  if (startISO && finalEndISO) {
    const start = parseDateFlexible(String(startISO));
    const end = parseDateFlexible(String(finalEndISO));
    if (start && end) {
      const weeks = String(weekDiffCeil(start, end));
      if (String(data.tp_lead_time ?? '') !== weeks) updates.tp_lead_time = weeks;
    }
  }

  return updates;
}

export function applyTrajectoryDateDerivations<T extends Record<string, unknown>>(data: T): T {
  const updates = getTrajectoryDateUpdates(data);
  if (Object.keys(updates).length === 0) return data;
  return { ...data, ...updates };
}
