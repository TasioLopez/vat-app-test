import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBookingMessage } from '@/lib/booking/email';
import {
  amsterdamWallTimeToUtc,
  formatBookingWhen,
  slotFromRatio,
  startOfAmsterdamWeek,
  timelinePlacement,
  weekdayIndex,
} from '@/lib/booking/time';
import {
  bookingRangeFromInputs,
  parseBookingRequest,
  parseGuestEmails,
  validateBookingWindow,
} from '@/lib/booking/validate';

const morning = amsterdamWallTimeToUtc(2026, 11, 12, 9, 0);
const lateMorning = amsterdamWallTimeToUtc(2026, 11, 12, 10, 0);

describe('Amsterdam time', () => {
  it('converts winter and summer wall time to UTC', () => {
    assert.equal(amsterdamWallTimeToUtc(2026, 11, 12, 8, 0).toISOString(), '2026-11-12T07:00:00.000Z');
    assert.equal(amsterdamWallTimeToUtc(2026, 7, 12, 8, 0).toISOString(), '2026-07-12T06:00:00.000Z');
    assert.equal(amsterdamWallTimeToUtc(2026, 11, 12, 0, 0).toISOString(), '2026-11-11T23:00:00.000Z');
  });

  it('starts the week on Monday', () => {
    assert.equal(weekdayIndex(2026, 11, 12), 3);
    const start = startOfAmsterdamWeek(morning);
    assert.deepEqual(start, { year: 2026, month: 11, day: 9 });
  });

  it('formats a same-day range in Dutch', () => {
    assert.equal(formatBookingWhen(morning, lateMorning), 'donderdag 12 november 2026, 09:00–10:00');
  });

  it('places a 09:00–10:00 booking on the 08:00–18:00 track', () => {
    const place = timelinePlacement(morning, lateMorning, { year: 2026, month: 11, day: 12 });
    assert.ok(place);
    assert.equal(Math.round(place.left), 10);
    assert.equal(Math.round(place.width), 10);
  });

  it('hides a booking that sits fully outside the visible hours', () => {
    const starts = amsterdamWallTimeToUtc(2026, 11, 12, 19, 0);
    const ends = amsterdamWallTimeToUtc(2026, 11, 12, 20, 0);
    assert.equal(timelinePlacement(starts, ends, { year: 2026, month: 11, day: 12 }), null);
  });

  it('snaps a click to a one-hour slot inside the day', () => {
    assert.deepEqual(slotFromRatio(0), { start: '08:00', end: '09:00' });
    assert.deepEqual(slotFromRatio(0.999), { start: '17:00', end: '18:00' });
  });
});

describe('booking validation', () => {
  it('rejects an end that is not after the start and a duration over 12 hours', () => {
    assert.equal(validateBookingWindow(lateMorning, morning), 'De eindtijd moet na de starttijd liggen.');
    const tooLong = new Date(morning.getTime() + 12 * 60 * 60 * 1000 + 1);
    assert.match(validateBookingWindow(morning, tooLong) ?? '', /12 uur/);
    assert.equal(validateBookingWindow(morning, new Date(morning.getTime() + 12 * 60 * 60 * 1000)), null);
  });

  it('rolls an earlier end clock onto the next day when that stays within 12 hours', () => {
    const range = bookingRangeFromInputs({ year: 2026, month: 11, day: 12 }, '22:00', '01:00');
    assert.ok(!('error' in range));
    if ('error' in range) return;
    assert.equal(range.startsAt.toISOString(), '2026-11-12T21:00:00.000Z');
    assert.equal(range.endsAt.toISOString(), '2026-11-13T00:00:00.000Z');
  });

  it('parses and dedupes guest emails', () => {
    const parsed = parseGuestEmails(['  Jan@Example.nl ', 'jan@example.nl', 'a@b.co']);
    assert.deepEqual(parsed.emails, ['jan@example.nl', 'a@b.co']);
    assert.equal(parseGuestEmails(['niet-een-mail']).error?.includes('Ongeldig'), true);
    assert.equal(parseGuestEmails(Array.from({ length: 21 }, (_, index) => `u${index}@x.nl`)).error?.includes('20'), true);
  });

  it('parses a booking request', () => {
    const parsed = parseBookingRequest({
      spaceId: '11111111-1111-4111-8111-111111111111',
      title: '  Overleg  ',
      startsAt: morning.toISOString(),
      endsAt: lateMorning.toISOString(),
      note: '  ',
      guestEmails: ['gast@example.nl'],
    });
    assert.ok('data' in parsed);
    if (!('data' in parsed)) return;
    assert.equal(parsed.data.title, 'Overleg');
    assert.equal(parsed.data.note, null);
    assert.deepEqual(parsed.data.guestEmails, ['gast@example.nl']);
  });
});

describe('booking email', () => {
  const details = {
    bookerName: 'Jan Jansen',
    title: '<script>',
    locationName: 'Kantoor Utrecht',
    locationAddress: 'Straat 1',
    spaceName: 'Vergaderzaal 1',
    spaceKind: 'room' as const,
    startsAt: morning,
    endsAt: lateMorning,
    note: 'Neem de sleutel mee',
    logoUrl: 'https://example.com/logo.svg',
  };

  it('confirms the booking with time, place, and escaped title', () => {
    const message = buildBookingMessage('confirmation', details);
    assert.match(message.subject, /Reservering bevestigd/);
    assert.match(message.text, /Kantoor Utrecht \(Straat 1\)/);
    assert.match(message.text, /Vergaderzaal 1/);
    assert.match(message.text, /09:00–10:00/);
    assert.match(message.text, /Jan Jansen/);
    assert.match(message.text, /Neem de sleutel mee/);
    assert.match(message.html, /&lt;script&gt;/);
    assert.doesNotMatch(message.html, /<script>/);
  });

  it('describes a cancellation', () => {
    const message = buildBookingMessage('cancellation', { ...details, title: 'Overleg', note: null });
    assert.match(message.subject, /Reservering geannuleerd: Overleg/);
    assert.match(message.text, /geannuleerd/);
    assert.doesNotMatch(message.text, /Notitie:/);
  });
});
