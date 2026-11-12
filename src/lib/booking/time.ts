import type { CalendarDay } from '@/lib/booking/types';

export const AMSTERDAM_TZ = 'Europe/Amsterdam';
export const TIMELINE_START_MINUTES = 8 * 60;
export const TIMELINE_END_MINUTES = 18 * 60;
export const MAX_BOOKING_MS = 12 * 60 * 60 * 1000;

const WEEKDAYS = [
  'maandag',
  'dinsdag',
  'woensdag',
  'donderdag',
  'vrijdag',
  'zaterdag',
  'zondag',
] as const;

const WEEKDAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const;

const MONTHS = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
] as const;

export type AmsterdamParts = CalendarDay & {
  hour: number;
  minute: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
};

/** Weekday of a calendar date. 0 = Monday … 6 = Sunday. */
export function weekdayIndex(year: number, month: number, day: number): number {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (utc.getUTCDay() + 6) % 7;
}

export function amsterdamParts(date: Date): AmsterdamParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: AMSTERDAM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  let hour = Number(map.hour);
  const minute = Number(map.minute);
  if (hour === 24) hour = 0;
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday: weekdayIndex(year, month, day),
  };
}

/** Convert an Amsterdam wall-clock time to a UTC instant. */
export function amsterdamWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  for (const offsetHours of [1, 2] as const) {
    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 60 * 60 * 1000);
    const parts = amsterdamParts(utc);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      return utc;
    }
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - 2 * 60 * 60 * 1000);
}

export function addCalendarDays(year: number, month: number, day: number, delta: number): CalendarDay {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function calendarDayFromDate(date: Date): CalendarDay {
  const parts = amsterdamParts(date);
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function startOfAmsterdamWeek(date: Date): CalendarDay {
  const parts = amsterdamParts(date);
  return addCalendarDays(parts.year, parts.month, parts.day, -parts.weekday);
}

export function sameCalendarDay(a: CalendarDay, b: CalendarDay): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function dayBounds(day: CalendarDay): { start: Date; end: Date } {
  const next = addCalendarDays(day.year, day.month, day.day, 1);
  return {
    start: amsterdamWallTimeToUtc(day.year, day.month, day.day, 0, 0),
    end: amsterdamWallTimeToUtc(next.year, next.month, next.day, 0, 0),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatClock(date: Date): string {
  const parts = amsterdamParts(date);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatDayInput(day: CalendarDay): string {
  return `${day.year}-${pad(day.month)}-${pad(day.day)}`;
}

export function formatWeekdayShort(day: CalendarDay): string {
  return WEEKDAYS_SHORT[weekdayIndex(day.year, day.month, day.day)];
}

export function formatMonthDay(day: CalendarDay): string {
  return `${day.day} ${MONTHS[day.month - 1]}`;
}

export function formatWeekRange(start: CalendarDay): string {
  const end = addCalendarDays(start.year, start.month, start.day, 6);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${end.day} ${MONTHS[start.month - 1]} ${start.year}`;
  }
  if (start.year === end.year) {
    return `${start.day} ${MONTHS[start.month - 1]} – ${end.day} ${MONTHS[end.month - 1]} ${start.year}`;
  }
  return `${start.day} ${MONTHS[start.month - 1]} ${start.year} – ${end.day} ${MONTHS[end.month - 1]} ${end.year}`;
}

export function formatBookingWhen(startsAt: Date, endsAt: Date): string {
  const start = amsterdamParts(startsAt);
  const end = amsterdamParts(endsAt);
  const startDate = `${WEEKDAYS[start.weekday]} ${start.day} ${MONTHS[start.month - 1]} ${start.year}`;
  const startClock = `${pad(start.hour)}:${pad(start.minute)}`;
  const endClock = `${pad(end.hour)}:${pad(end.minute)}`;
  if (start.year !== end.year || start.month !== end.month || start.day !== end.day) {
    const endDate = `${WEEKDAYS[end.weekday]} ${end.day} ${MONTHS[end.month - 1]} ${end.year}`;
    return `${startDate}, ${startClock} – ${endDate}, ${endClock}`;
  }
  return `${startDate}, ${startClock}–${endClock}`;
}

export function timelinePlacement(
  startsAt: Date,
  endsAt: Date,
  day: CalendarDay
): { left: number; width: number } | null {
  const windowStart = amsterdamWallTimeToUtc(day.year, day.month, day.day, 8, 0);
  const windowEnd = amsterdamWallTimeToUtc(day.year, day.month, day.day, 18, 0);
  const startMs = Math.max(startsAt.getTime(), windowStart.getTime());
  const endMs = Math.min(endsAt.getTime(), windowEnd.getTime());
  if (endMs <= startMs) return null;
  const span = windowEnd.getTime() - windowStart.getTime();
  return {
    left: ((startMs - windowStart.getTime()) / span) * 100,
    width: ((endMs - startMs) / span) * 100,
  };
}

function minutesToClock(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${pad(hour)}:${pad(minute)}`;
}

/** Map a click ratio on the 08:00–18:00 track to a one-hour slot, snapped to 30 minutes. */
export function slotFromRatio(ratio: number): { start: string; end: string } {
  const span = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES;
  const clamped = Math.min(0.999, Math.max(0, ratio));
  const minutesFromStart = Math.floor(clamped * span);
  const snapped = Math.floor(minutesFromStart / 30) * 30;
  let startMin = TIMELINE_START_MINUTES + snapped;
  let endMin = startMin + 60;
  if (endMin > TIMELINE_END_MINUTES) {
    endMin = TIMELINE_END_MINUTES;
    startMin = Math.max(TIMELINE_START_MINUTES, endMin - 60);
  }
  return { start: minutesToClock(startMin), end: minutesToClock(endMin) };
}
