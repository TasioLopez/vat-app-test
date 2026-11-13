import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserWithRole } from '@/lib/help/auth';
import { sendBookingEmails } from '@/lib/booking/email';
import { isSpaceKind } from '@/lib/booking/types';
import { parseBookingRequest } from '@/lib/booking/validate';
import { formatOrgUserDisplayName } from '@/lib/users/org-directory';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const EMAIL_WARNING =
  'De reservering staat vast, maar de bevestigingsmail kon niet worden verstuurd.';

function isOverlapError(error: { code?: string; message?: string }): boolean {
  return error.code === '23P01' || (error.message ?? '').includes('bookings_no_overlap');
}

export async function POST(req: NextRequest) {
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

  const supabase = await getSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', session.userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Gebruikersprofiel niet gevonden.' }, { status: 400 });
  }

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('id, name, kind, active, location_id')
    .eq('id', parsed.data.spaceId)
    .maybeSingle();

  if (spaceError) {
    return NextResponse.json({ error: spaceError.message }, { status: 500 });
  }
  if (!space || !isSpaceKind(space.kind)) {
    return NextResponse.json({ error: 'Deze ruimte of parkeerplaats bestaat niet.' }, { status: 404 });
  }

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name, address, active')
    .eq('id', space.location_id)
    .maybeSingle();

  if (locationError) {
    return NextResponse.json({ error: locationError.message }, { status: 500 });
  }
  if (!location) {
    return NextResponse.json({ error: 'Deze locatie bestaat niet.' }, { status: 404 });
  }
  if (!space.active || !location.active) {
    return NextResponse.json({ error: 'Deze ruimte is niet beschikbaar.' }, { status: 400 });
  }

  const bookerName = formatOrgUserDisplayName(profile);
  const bookerEmail = profile.email.trim().toLowerCase();

  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      space_id: space.id,
      booked_by: session.userId,
      booker_name: bookerName,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt.toISOString(),
      ends_at: parsed.data.endsAt.toISOString(),
      note: parsed.data.note,
    })
    .select('id, space_id, booked_by, booker_name, title, starts_at, ends_at, note, created_at')
    .single();

  if (insertError || !booking) {
    if (insertError && isOverlapError(insertError)) {
      return NextResponse.json({ error: 'Dit tijdslot is al bezet.' }, { status: 409 });
    }
    const message = insertError?.message ?? 'De reservering kon niet worden opgeslagen.';
    const status = message.toLowerCase().includes('row-level security') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  let emailWarning: string | null = null;
  const mailDetails = {
    bookerName: booking.booker_name,
    title: booking.title,
    locationName: location.name,
    locationAddress: location.address,
    spaceName: space.name,
    spaceKind: space.kind,
    startsAt: new Date(booking.starts_at),
    endsAt: new Date(booking.ends_at),
    note: booking.note,
  };
  try {
    const failures = await sendBookingEmails('confirmation', 'booker', [bookerEmail], mailDetails);
    if (failures.length > 0) emailWarning = EMAIL_WARNING;
  } catch (error) {
    console.error('Booking confirmation email failed', error);
    emailWarning = EMAIL_WARNING;
  }

  return NextResponse.json({ booking, emailWarning }, { status: 201 });
}
