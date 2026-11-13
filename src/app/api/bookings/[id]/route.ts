import { NextResponse } from 'next/server';
import { canChangeBooking } from '@/lib/auth/roles';
import { sendBookingEmails, type BookingMailKind } from '@/lib/booking/email';
import { isSpaceKind, type SpaceKind } from '@/lib/booking/types';
import { parseBookingRequest } from '@/lib/booking/validate';
import { getSessionUserWithRole } from '@/lib/help/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const CANCEL_EMAIL_WARNING =
  'De reservering is geannuleerd, maar de e-mail kon niet worden verstuurd.';
const UPDATE_EMAIL_WARNING =
  'De reservering is gewijzigd, maar de e-mail kon niet worden verstuurd.';

function isOverlapError(error: { code?: string; message?: string }): boolean {
  return error.code === '23P01' || (error.message ?? '').includes('bookings_no_overlap');
}

async function notifyBooker(
  kind: BookingMailKind,
  bookerEmail: string | null,
  details: {
    bookerName: string;
    title: string;
    locationName: string;
    locationAddress: string | null;
    spaceName: string;
    spaceKind: SpaceKind;
    startsAt: Date;
    endsAt: Date;
    note: string | null;
  }
): Promise<string | null> {
  try {
    const failures = await sendBookingEmails(kind, 'booker', [bookerEmail ?? ''], details);
    return failures.length > 0 ? 'failed' : null;
  } catch (error) {
    console.error('Booking email failed', error);
    return 'failed';
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }

  const parsed = parseBookingRequest(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, space_id, booked_by, booker_name')
    .eq('id', id)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: 'Reservering niet gevonden.' }, { status: 404 });
  }
  if (!canChangeBooking(session.role, session.userId, booking.booked_by)) {
    return NextResponse.json({ error: 'U kunt alleen uw eigen reservering wijzigen.' }, { status: 403 });
  }

  if (parsed.data.spaceId !== booking.space_id) {
    const { data: nextSpace, error: spaceError } = await supabase
      .from('spaces')
      .select('id, active, location_id')
      .eq('id', parsed.data.spaceId)
      .maybeSingle();
    if (spaceError) {
      return NextResponse.json({ error: spaceError.message }, { status: 500 });
    }
    const { data: nextLocation } = nextSpace
      ? await supabase.from('locations').select('active').eq('id', nextSpace.location_id).maybeSingle()
      : { data: null };
    if (!nextSpace || !nextSpace.active || !nextLocation?.active) {
      return NextResponse.json({ error: 'Deze ruimte is niet beschikbaar.' }, { status: 400 });
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({
      space_id: parsed.data.spaceId,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt.toISOString(),
      ends_at: parsed.data.endsAt.toISOString(),
      note: parsed.data.note,
    })
    .eq('id', booking.id)
    .select('id, space_id, booked_by, booker_name, title, starts_at, ends_at, note')
    .maybeSingle();

  if (updateError) {
    if (isOverlapError(updateError)) {
      return NextResponse.json({ error: 'Dit tijdslot is al bezet.' }, { status: 409 });
    }
    const message = updateError.message ?? 'De reservering kon niet worden gewijzigd.';
    if (message.includes('niet beschikbaar') || message.includes('iemand anders')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const status = message.toLowerCase().includes('row-level security') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
  if (!updated) {
    return NextResponse.json({ error: 'U kunt alleen uw eigen reservering wijzigen.' }, { status: 403 });
  }

  const { data: space } = await supabase
    .from('spaces')
    .select('name, kind, location_id')
    .eq('id', updated.space_id)
    .maybeSingle();
  const { data: location } = space
    ? await supabase.from('locations').select('name, address').eq('id', space.location_id).maybeSingle()
    : { data: null };

  let bookerEmail: string | null = null;
  if (updated.booked_by) {
    const { data: booker } = await supabase
      .from('users')
      .select('email')
      .eq('id', updated.booked_by)
      .maybeSingle();
    bookerEmail = booker?.email ?? null;
  }

  const kind = space && isSpaceKind(space.kind) ? space.kind : 'room';
  const emailFailed = await notifyBooker('update', bookerEmail, {
    bookerName: updated.booker_name,
    title: updated.title,
    locationName: location?.name ?? 'Locatie',
    locationAddress: location?.address ?? null,
    spaceName: space?.name ?? 'Ruimte',
    spaceKind: kind,
    startsAt: new Date(updated.starts_at),
    endsAt: new Date(updated.ends_at),
    note: updated.note,
  });

  return NextResponse.json({
    booking: updated,
    emailWarning: emailFailed ? UPDATE_EMAIL_WARNING : null,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, space_id, booked_by, booker_name, title, starts_at, ends_at, note')
    .eq('id', id)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: 'Reservering niet gevonden.' }, { status: 404 });
  }
  if (!canChangeBooking(session.role, session.userId, booking.booked_by)) {
    return NextResponse.json({ error: 'U kunt alleen uw eigen reservering annuleren.' }, { status: 403 });
  }

  const { data: space } = await supabase
    .from('spaces')
    .select('name, kind, location_id')
    .eq('id', booking.space_id)
    .maybeSingle();

  const { data: location } = space
    ? await supabase.from('locations').select('name, address').eq('id', space.location_id).maybeSingle()
    : { data: null };

  let bookerEmail: string | null = null;
  if (booking.booked_by) {
    const { data: booker } = await supabase
      .from('users')
      .select('email')
      .eq('id', booking.booked_by)
      .maybeSingle();
    bookerEmail = booker?.email ?? null;
  }

  const { error: deleteError } = await supabase.from('bookings').delete().eq('id', booking.id);
  if (deleteError) {
    const message = deleteError.message ?? 'De reservering kon niet worden geannuleerd.';
    const status = message.toLowerCase().includes('row-level security') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const kind = space && isSpaceKind(space.kind) ? space.kind : 'room';
  const emailFailed = await notifyBooker('cancellation', bookerEmail, {
    bookerName: booking.booker_name,
    title: booking.title,
    locationName: location?.name ?? 'Locatie',
    locationAddress: location?.address ?? null,
    spaceName: space?.name ?? 'Ruimte',
    spaceKind: kind,
    startsAt: new Date(booking.starts_at),
    endsAt: new Date(booking.ends_at),
    note: booking.note,
  });

  return NextResponse.json({ ok: true, emailWarning: emailFailed ? CANCEL_EMAIL_WARNING : null });
}
