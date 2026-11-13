'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import BookingDetailDialog from '@/components/booking/BookingDetailDialog';
import BookingFormDialog, { type BookingDraft } from '@/components/booking/BookingFormDialog';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToastHelpers } from '@/components/ui/Toast';
import { canChangeBooking, canManageSpaces } from '@/lib/auth/roles';
import {
  addCalendarDays,
  amsterdamWallTimeToUtc,
  calendarDayFromDate,
  dayBounds,
  formatBookingWhen,
  formatClock,
  formatDayInput,
  formatMonthDay,
  formatWeekdayShort,
  formatWeekRange,
  sameCalendarDay,
  slotFromRatio,
  startOfAmsterdamWeek,
  timelinePlacement,
  TIMELINE_END_MINUTES,
  TIMELINE_START_MINUTES,
  weekdayIndex,
} from '@/lib/booking/time';
import {
  isSpaceKind,
  spaceKindPlural,
  type BookingRow,
  type CalendarDay,
  type LocationRow,
  type SpaceKind,
  type SpaceRow,
} from '@/lib/booking/types';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 11 }, (_, index) => TIMELINE_START_MINUTES / 60 + index);

type BookingCalendarProps = {
  role: string;
  userId: string;
};

export default function BookingCalendar({ role, userId }: BookingCalendarProps) {
  const { showSuccess, showError, showWarning } = useToastHelpers();
  const canManage = canManageSpaces(role);

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [dayBookings, setDayBookings] = useState<BookingRow[]>([]);
  const [mine, setMine] = useState<BookingRow[]>([]);
  const [locationId, setLocationId] = useState('');
  const [kind, setKind] = useState<SpaceKind>('room');
  const [selected, setSelected] = useState<CalendarDay>(() => calendarDayFromDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [detail, setDetail] = useState<BookingRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const loadSeq = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const loadCatalog = useCallback(async () => {
    const [{ data: locationRows, error: locationError }, { data: spaceRows, error: spaceError }] =
      await Promise.all([
        supabase.from('locations').select('id, name, address, active, created_at').order('name'),
        supabase
          .from('spaces')
          .select('id, location_id, kind, name, capacity, notes, active, created_at')
          .order('name'),
      ]);
    if (locationError || spaceError) {
      throw new Error(locationError?.message || spaceError?.message || 'Laden mislukt');
    }
    return {
      locations: locationRows ?? [],
      spaces: (spaceRows ?? []).flatMap((row) =>
        isSpaceKind(row.kind) ? [{ ...row, kind: row.kind }] : []
      ),
    };
  }, []);

  const loadDay = useCallback(async (day: CalendarDay) => {
    const bounds = dayBounds(day);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, space_id, booked_by, booker_name, title, starts_at, ends_at, created_at')
      .lt('starts_at', bounds.end.toISOString())
      .gt('ends_at', bounds.start.toISOString());
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ ...row, note: null }));
  }, []);

  const loadMine = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, space_id, booked_by, booker_name, title, starts_at, ends_at, created_at')
      .eq('booked_by', userId)
      .gt('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ ...row, note: null }));
  }, [userId]);

  const reload = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoadError(null);
    try {
      const [catalog, dayRows, mineRows] = await Promise.all([
        loadCatalog(),
        loadDay(selected),
        loadMine(),
      ]);
      if (seq !== loadSeq.current) return;
      setLocations(catalog.locations);
      setSpaces(catalog.spaces);
      setDayBookings(dayRows);
      setMine(mineRows);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      setLoadError(error instanceof Error ? error.message : 'Laden mislukt');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [loadCatalog, loadDay, loadMine, selected]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!locationId && locations.length > 0) {
      setLocationId((locations.find((location) => location.active) ?? locations[0]).id);
      return;
    }
    if (locationId && !locations.some((location) => location.id === locationId)) {
      setLocationId((locations.find((location) => location.active) ?? locations[0])?.id ?? '');
    }
  }, [locations, locationId]);

  const location = locations.find((item) => item.id === locationId) ?? null;
  const weekStart = startOfAmsterdamWeek(
    amsterdamWallTimeToUtc(selected.year, selected.month, selected.day, 12, 0)
  );
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(weekStart.year, weekStart.month, weekStart.day, index)
  );
  const today = calendarDayFromDate(now);

  const visibleSpaces = useMemo(() => {
    return spaces
      .filter((space) => space.location_id === locationId && space.kind === kind)
      .filter(
        (space) =>
          space.active || dayBookings.some((booking) => booking.space_id === space.id)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }, [spaces, locationId, kind, dayBookings]);

  const spaceById = useMemo(() => new Map(spaces.map((space) => [space.id, space])), [spaces]);
  const locationById = useMemo(
    () => new Map(locations.map((item) => [item.id, item])),
    [locations]
  );

  function openDraft(space: SpaceRow, start: string, end: string) {
    if (!location?.active || !space.active) {
      showError('Niet beschikbaar', 'Deze ruimte of locatie is inactief.');
      return;
    }
    setDraft({
      space,
      locationName: location.name,
      date: formatDayInput(selected),
      start,
      end,
    });
  }

  async function openEdit(booking: BookingRow) {
    const space = spaceById.get(booking.space_id);
    if (!space) {
      showError('Wijzigen mislukt', 'De ruimte van deze reservering is niet gevonden.');
      return;
    }
    const { data, error } = await supabase.from('bookings').select('note').eq('id', booking.id).maybeSingle();
    if (error) {
      showError('Wijzigen mislukt', error.message);
      return;
    }
    const bookingLocation = locationById.get(space.location_id);
    setDetail(null);
    setDraft({
      bookingId: booking.id,
      space,
      locationName: bookingLocation?.name ?? 'Locatie',
      date: formatDayInput(calendarDayFromDate(new Date(booking.starts_at))),
      start: formatClock(new Date(booking.starts_at)),
      end: formatClock(new Date(booking.ends_at)),
      title: booking.title,
      note: data?.note ?? '',
    });
  }

  function onTrackClick(event: React.MouseEvent<HTMLDivElement>, space: SpaceRow) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const slot = slotFromRatio(ratio);
    openDraft(space, slot.start, slot.end);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${cancelTarget.id}`, { method: 'DELETE' });
      const body = (await response.json().catch(() => ({}))) as { error?: string; emailWarning?: string | null };
      if (!response.ok) {
        showError('Annuleren mislukt', body.error ?? 'Probeer het opnieuw.');
        return;
      }
      setCancelTarget(null);
      if (body.emailWarning) showWarning('Geannuleerd', body.emailWarning);
      else showSuccess('Reservering geannuleerd', 'De persoon die gereserveerd heeft ontvangt een e-mail.');
      await reload();
    } catch {
      showError('Annuleren mislukt', 'Probeer het opnieuw.');
    } finally {
      setCancelling(false);
    }
  }

  const nowRatio = useMemo(() => {
    if (!sameCalendarDay(today, selected)) return null;
    const parts = calendarDayFromDate(now);
    if (!sameCalendarDay(parts, selected)) return null;
    const minutes = now.getTime();
    const windowStart = amsterdamWallTimeToUtc(selected.year, selected.month, selected.day, 8, 0).getTime();
    const windowEnd = amsterdamWallTimeToUtc(selected.year, selected.month, selected.day, 18, 0).getTime();
    if (minutes < windowStart || minutes > windowEnd) return null;
    return ((minutes - windowStart) / (windowEnd - windowStart)) * 100;
  }, [now, selected, today]);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-purple-50/50 p-4 pb-10 md:p-6 md:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Ruimtes en parkeerplaatsen
          </h1>
          {canManage ? (
            <Button asChild variant="outline">
              <Link href="/dashboard/reserveren/beheer">Beheer</Link>
            </Button>
          ) : null}
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Agenda laden…" />
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
            {loadError}
          </div>
        ) : locations.length === 0 ? (
          <EmptyCatalog canManage={canManage} />
        ) : (
          <>
            <section className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-full sm:w-72" aria-label="Locatie">
                      <SelectValue placeholder="Kies een locatie" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                          {item.active ? '' : ' (inactief)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="inline-flex w-fit rounded-xl bg-purple-100 p-1">
                    {(['room', 'parking'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setKind(value)}
                        className={cn(
                          'cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                          kind === value
                            ? 'bg-white text-purple-900 shadow-sm'
                            : 'text-purple-800/70 hover:text-purple-950'
                        )}
                      >
                        {spaceKindPlural(value)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" aria-label="Vorige week" onClick={() => setSelected((day) => addCalendarDays(day.year, day.month, day.day, -7))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-40 text-center text-sm font-medium text-slate-800">
                    {formatWeekRange(weekStart)}
                  </div>
                  <Button type="button" variant="outline" size="icon" aria-label="Volgende week" onClick={() => setSelected((day) => addCalendarDays(day.year, day.month, day.day, 7))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSelected(calendarDayFromDate(new Date()))}>
                    Vandaag
                  </Button>
                </div>
              </div>
              {location?.address ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {location.address}
                </p>
              ) : null}
              {location && !location.active ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Deze locatie is inactief. Nieuwe reserveringen zijn niet mogelijk.
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const active = sameCalendarDay(day, selected);
                  const isToday = sameCalendarDay(day, today);
                  return (
                    <button
                      key={formatDayInput(day)}
                      type="button"
                      onClick={() => setSelected(day)}
                      className={cn(
                        'cursor-pointer rounded-xl px-1 py-2 text-center transition-colors',
                        active
                          ? 'bg-purple-700 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-purple-50'
                      )}
                    >
                      <div className="text-[11px] uppercase tracking-wide opacity-80">
                        {formatWeekdayShort(day)}
                      </div>
                      <div className="text-base font-semibold">{day.day}</div>
                      {isToday ? (
                        <div className={cn('mx-auto mt-1 h-1 w-1 rounded-full', active ? 'bg-amber-300' : 'bg-purple-500')} />
                      ) : (
                        <div className="mt-1 h-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {formatWeekdayLong(selected)} {formatMonthDay(selected)}
                </h2>
                <p className="hidden text-sm text-slate-500 md:block">08:00–18:00 · klik op een vrij moment</p>
              </div>

              {visibleSpaces.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  Er zijn nog geen {kind === 'room' ? 'ruimtes' : 'parkeerplaatsen'} op deze locatie.
                  {canManage ? (
                    <>
                      {' '}
                      <Link href="/dashboard/reserveren/beheer" className="font-medium text-purple-700 underline">
                        Voeg er een toe
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              ) : (
                <>
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="mb-1 flex">
                          <div className="w-48 shrink-0" />
                          <div className="relative h-6 flex-1">
                            {HOURS.map((hour) => {
                              const atStart = hour === HOURS[0];
                              const atEnd = hour === HOURS[HOURS.length - 1];
                              return (
                                <span
                                  key={hour}
                                  className={`absolute top-0 text-[11px] text-slate-400 ${atStart || atEnd ? '' : '-translate-x-1/2'}`}
                                  style={
                                    atEnd
                                      ? { right: 0 }
                                      : {
                                          left: `${((hour * 60 - TIMELINE_START_MINUTES) / (TIMELINE_END_MINUTES - TIMELINE_START_MINUTES)) * 100}%`,
                                        }
                                  }
                                >
                                  {String(hour).padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {visibleSpaces.map((space) => {
                            const bookings = dayBookings
                              .filter((booking) => booking.space_id === space.id)
                              .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                            return (
                              <div key={space.id} className="flex items-stretch gap-3">
                                <div className="flex w-48 shrink-0 flex-col justify-center">
                                  <div className="truncate text-sm font-medium text-slate-900">{space.name}</div>
                                  <div className="text-xs text-slate-500">
                                    {[
                                      space.kind === 'room'
                                        ? space.capacity
                                          ? `${space.capacity} pers.`
                                          : null
                                        : null,
                                      space.active ? null : 'Inactief',
                                    ]
                                      .filter(Boolean)
                                      .join(' · ') || '\u00a0'}
                                  </div>
                                  {bookings
                                    .filter(
                                      (booking) =>
                                        !timelinePlacement(
                                          new Date(booking.starts_at),
                                          new Date(booking.ends_at),
                                          selected
                                        )
                                    )
                                    .map((booking) => (
                                      <button
                                        key={booking.id}
                                        type="button"
                                        className="mt-1 block max-w-full cursor-pointer truncate text-left text-[11px] font-medium text-purple-700"
                                        onClick={() => setDetail(booking)}
                                      >
                                        {formatClock(new Date(booking.starts_at))}–{formatClock(new Date(booking.ends_at))}{' '}
                                        {booking.title}
                                      </button>
                                    ))}
                                  <button
                                    type="button"
                                    className="mt-1 w-fit cursor-pointer text-xs font-medium text-purple-700 hover:text-purple-900"
                                    onClick={() => openDraft(space, '09:00', '10:00')}
                                  >
                                    Reserveer
                                  </button>
                                </div>
                                <div
                                  className="relative h-16 flex-1 cursor-pointer rounded-xl border border-purple-100 bg-slate-50"
                                  style={{
                                    backgroundImage:
                                      'repeating-linear-gradient(to right, transparent, transparent calc(10% - 1px), rgb(233 213 255 / 0.9) calc(10% - 1px), rgb(233 213 255 / 0.9) 10%)',
                                  }}
                                  onClick={(event) => onTrackClick(event, space)}
                                  role="presentation"
                                >
                                  {nowRatio !== null ? (
                                    <div
                                      className="pointer-events-none absolute inset-y-0 z-10 w-1 bg-rose-500"
                                      style={{ left: `${nowRatio}%` }}
                                    />
                                  ) : null}
                                  {bookings.map((booking) => {
                                    const place = timelinePlacement(
                                      new Date(booking.starts_at),
                                      new Date(booking.ends_at),
                                      selected
                                    );
                                    if (!place) return null;
                                    const own = booking.booked_by === userId;
                                    return (
                                      <button
                                        key={booking.id}
                                        type="button"
                                        className={cn(
                                          'absolute top-1.5 bottom-1.5 z-20 overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm',
                                          kind === 'room' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-700 hover:bg-teal-800',
                                          own && 'ring-2 ring-amber-300'
                                        )}
                                        style={{
                                          left: `calc(${place.left}% + 2px)`,
                                          width: `max(28px, calc(${place.width}% - 4px))`,
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setDetail(booking);
                                        }}
                                      >
                                        <div className="truncate text-xs font-semibold">{booking.title}</div>
                                        <div className="truncate text-[11px] text-white/85">
                                          {formatClock(new Date(booking.starts_at))}–{formatClock(new Date(booking.ends_at))}
                                          {' · '}
                                          {own ? 'Jij' : booking.booker_name}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {visibleSpaces.map((space) => {
                      const bookings = dayBookings
                        .filter((booking) => booking.space_id === space.id)
                        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                      return (
                        <article key={space.id} className="rounded-xl border border-purple-100 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-medium text-slate-900">{space.name}</h3>
                              <p className="text-xs text-slate-500">
                                {space.capacity ? `${space.capacity} personen` : spaceKindPlural(kind)}
                                {!space.active ? ' · inactief' : ''}
                              </p>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={() => openDraft(space, '09:00', '10:00')}>
                              Reserveer
                            </Button>
                          </div>
                          {bookings.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">Vrij op deze dag.</p>
                          ) : (
                            <ul className="mt-3 space-y-2">
                              {bookings.map((booking) => (
                                <li key={booking.id}>
                                  <button
                                    type="button"
                                    className="w-full cursor-pointer rounded-lg bg-purple-50 px-3 py-2 text-left"
                                    onClick={() => setDetail(booking)}
                                  >
                                    <div className="text-sm font-medium text-purple-950">{booking.title}</div>
                                    <div className="text-xs text-purple-800/80">
                                      {formatClock(new Date(booking.starts_at))}–{formatClock(new Date(booking.ends_at))}
                                      {' · '}
                                      {booking.booked_by === userId ? 'Jij' : booking.booker_name}
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Mijn reserveringen</h2>
              {mine.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">U hebt geen komende reserveringen.</p>
              ) : (
                <ul className="mt-3 divide-y divide-purple-50">
                  {mine.map((booking) => {
                    const space = spaceById.get(booking.space_id);
                    const bookingLocation = space ? locationById.get(space.location_id) : undefined;
                    return (
                      <li key={booking.id} className="py-1">
                        <button
                          type="button"
                          className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg py-2 text-left hover:bg-purple-50"
                          onClick={() => setDetail(booking)}
                        >
                        <div>
                          <div className="font-medium text-slate-900">{booking.title}</div>
                          <div className="text-sm text-slate-600">
                            {space?.name ?? 'Ruimte'}
                            {bookingLocation ? ` · ${bookingLocation.name}` : ''}
                          </div>
                          <div className="text-sm text-slate-500">
                            {formatBookingWhen(new Date(booking.starts_at), new Date(booking.ends_at))}
                          </div>
                        </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <BookingFormDialog
        draft={draft}
        spaceOptions={
          draft
            ? spaces.filter(
                (space) =>
                  space.location_id === draft.space.location_id &&
                  space.kind === draft.space.kind &&
                  (space.active || space.id === draft.space.id)
              )
            : []
        }
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        onBooked={(emailWarning, updated) => {
          if (updated) {
            if (emailWarning) showWarning('Reservering gewijzigd', emailWarning);
            else showSuccess('Reservering gewijzigd', 'De persoon die gereserveerd heeft ontvangt een e-mail.');
          } else if (emailWarning) {
            showWarning('Reservering opgeslagen', emailWarning);
          } else {
            showSuccess('Reservering bevestigd', 'De bevestiging is per e-mail verstuurd.');
          }
          void reload();
        }}
      />
      <BookingDetailDialog
        booking={detail}
        space={detail ? spaceById.get(detail.space_id) ?? null : null}
        location={
          detail
            ? locationById.get(spaceById.get(detail.space_id)?.location_id ?? '') ?? null
            : null
        }
        userId={userId}
        canChange={detail ? canChangeBooking(role, userId, detail.booked_by) : false}
        onClose={() => setDetail(null)}
        onRequestEdit={(booking) => {
          void openEdit(booking);
        }}
        onRequestCancel={(booking) => {
          setDetail(null);
          setCancelTarget(booking);
        }}
      />
      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open && !cancelling) setCancelTarget(null);
        }}
        title="Reservering annuleren?"
        description="De persoon die gereserveerd heeft ontvangt een e-mail."
        confirmLabel="Annuleer reservering"
        cancelLabel="Terug"
        variant="destructive"
        loading={cancelling}
        onConfirm={confirmCancel}
      />
    </div>
  );
}

function formatWeekdayLong(day: CalendarDay): string {
  const names = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  return names[weekdayIndex(day.year, day.month, day.day)];
}

function EmptyCatalog({ canManage }: { canManage: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-purple-200 bg-white px-6 py-16 text-center">
      <CalendarDays className="mx-auto mb-3 h-8 w-8 text-purple-400" />
      <h2 className="text-lg font-semibold text-slate-900">Nog geen locaties</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        {canManage
          ? 'Voeg eerst een locatie toe, en daarna ruimtes of parkeerplaatsen.'
          : 'Er is nog niets om te reserveren. Vraag een beheerder om locaties toe te voegen.'}
      </p>
      {canManage ? (
        <Button asChild className="mt-5">
          <Link href="/dashboard/reserveren/beheer">Naar beheer</Link>
        </Button>
      ) : null}
    </div>
  );
}
