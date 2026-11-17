import type { SupabaseClient } from '@supabase/supabase-js';

/** Read private note for a booking (RLS: owner/admin/back_office only). */
export async function getBookingNote(
  supabase: SupabaseClient,
  bookingId: string
): Promise<{ note: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('booking_notes')
    .select('body')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) return { note: null, error: error.message };
  const body = data?.body?.trim() ?? '';
  return { note: body || null, error: null };
}

/** Insert or update private note; empty/null removes the row. */
export async function upsertBookingNote(
  supabase: SupabaseClient,
  bookingId: string,
  note: string | null
): Promise<{ error: string | null }> {
  const body = (note ?? '').trim();
  if (!body) {
    const { error } = await supabase.from('booking_notes').delete().eq('booking_id', bookingId);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from('booking_notes').upsert(
    { booking_id: bookingId, body },
    { onConflict: 'booking_id' }
  );
  return { error: error?.message ?? null };
}
