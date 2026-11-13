import { normalizeEmail } from '@/lib/cv-share/normalize-email';
import {
  addCalendarDays,
  amsterdamWallTimeToUtc,
  MAX_BOOKING_MS,
} from '@/lib/booking/time';
import type { CalendarDay } from '@/lib/booking/types';

export const MAX_GUEST_EMAILS = 20;
export const MAX_TITLE_LENGTH = 120;
export const MAX_NOTE_LENGTH = 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BookingRequest = {
  spaceId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  note: string | null;
  guestEmails: string[];
};

export function validateBookingWindow(startsAt: Date, endsAt: Date): string | null {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return 'Ongeldige datum of tijd.';
  }
  if (endsAt <= startsAt) {
    return 'De eindtijd moet na de starttijd liggen.';
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_BOOKING_MS) {
    return 'Een reservering mag maximaal 12 uur duren.';
  }
  return null;
}

export function parseGuestEmails(inputs: string[]): { emails: string[]; error: string | null } {
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const raw of inputs) {
    const email = normalizeEmail(raw);
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email)) {
      return { emails: [], error: `Ongeldig e-mailadres: ${raw.trim()}` };
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  if (emails.length > MAX_GUEST_EMAILS) {
    return { emails: [], error: 'U kunt maximaal 20 extra genodigden toevoegen.' };
  }
  return { emails, error: null };
}

export function parseDateInput(value: string): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function parseClock(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Build a range from a start date and two clocks.
 * When the end clock is not after the start clock, the end falls on the next day.
 */
export function bookingRangeFromInputs(
  day: CalendarDay,
  startClock: string,
  endClock: string
): { startsAt: Date; endsAt: Date } | { error: string } {
  const start = parseClock(startClock);
  const end = parseClock(endClock);
  if (!start || !end) return { error: 'Ongeldige datum of tijd.' };

  const startsAt = amsterdamWallTimeToUtc(day.year, day.month, day.day, start.hour, start.minute);
  const startMins = start.hour * 60 + start.minute;
  const endMins = end.hour * 60 + end.minute;
  const endDay = endMins <= startMins ? addCalendarDays(day.year, day.month, day.day, 1) : day;
  const endsAt = amsterdamWallTimeToUtc(endDay.year, endDay.month, endDay.day, end.hour, end.minute);
  const windowError = validateBookingWindow(startsAt, endsAt);
  if (windowError) return { error: windowError };
  return { startsAt, endsAt };
}

export function parseBookingRequest(body: unknown): { data: BookingRequest } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Ongeldige aanvraag.' };
  const record = body as Record<string, unknown>;

  const spaceId = typeof record.spaceId === 'string' ? record.spaceId.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(spaceId)) {
    return { error: 'Kies een ruimte of parkeerplaats.' };
  }

  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (!title) return { error: 'Vul een titel in.' };
  if (title.length > MAX_TITLE_LENGTH) return { error: 'De titel is te lang.' };

  const noteRaw = typeof record.note === 'string' ? record.note.trim() : '';
  if (noteRaw.length > MAX_NOTE_LENGTH) return { error: 'De notitie is te lang.' };

  const startsAt = new Date(typeof record.startsAt === 'string' ? record.startsAt : '');
  const endsAt = new Date(typeof record.endsAt === 'string' ? record.endsAt : '');
  const windowError = validateBookingWindow(startsAt, endsAt);
  if (windowError) return { error: windowError };

  return {
    data: {
      spaceId,
      title,
      startsAt,
      endsAt,
      note: noteRaw || null,
      guestEmails: [],
    },
  };
}
