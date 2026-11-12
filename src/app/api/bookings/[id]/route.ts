import { NextResponse } from 'next/server';
import { canCancelBooking } from '@/lib/auth/roles';
import { sendBookingEmails } from '@/lib/booking/email';
import { isSpaceKind } from '@/lib/booking/types';
import { getSessionUserWithRole } from '@/lib/help/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const EMAIL_WARNING =
  'De reservering is geannuleerd, maar de e-mail kon niet naar iedereen worden verstuurd.';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
  }
  if (!canCancelBooking(session.role)) {
    return NextResponse.json({ error: 'Alleen een beheerder kan een reservering annuleren.' }, { status: 403 });
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

  const { data: space } = await supabase
    .from('spaces')
    .select('name, kind, location_id')
    .eq('id', booking.space_id)
    .maybeSingle();

  const { data: location } = space
    ? await supabase.from('locations').select('name, address').eq('id', space.location_id).maybeSingle()
    : { data: null };

  const { data: guests } = await supabase
    .from('booking_guests')
    .select('email')
    .eq('booking_id', booking.id);

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
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const kind = space && isSpaceKind(space.kind) ? space.kind : 'room';
  let emailWarning: string | null = null;
  try {
    const failures = await sendBookingEmails(
      'cancellation',
      [bookerEmail ?? '', ...(guests ?? []).map((guest) => guest.email)],
      {
        bookerName: booking.booker_name,
        title: booking.title,
        locationName: location?.name ?? 'Locatie',
        locationAddress: location?.address ?? null,
        spaceName: space?.name ?? 'Ruimte',
        spaceKind: kind,
        startsAt: new Date(booking.starts_at),
        endsAt: new Date(booking.ends_at),
        note: booking.note,
      }
    );
    if (failures.length > 0) emailWarning = EMAIL_WARNING;
  } catch (error) {
    console.error('Booking cancellation email failed', error);
    emailWarning = EMAIL_WARNING;
  }

  return NextResponse.json({ ok: true, emailWarning });
}
