import type { SupabaseClient } from '@supabase/supabase-js';
import { canManageAnyBooking } from '@/lib/auth/roles';
import { MAX_TITLE_LENGTH } from '@/lib/booking/validate';
import type { Database } from '@/types/supabase';
import { formatOrgUserDisplayName } from '@/lib/users/org-directory';

export type BookingOwner = {
  id: string;
  email: string;
  name: string;
};

type ResolveBookingOwnerResult = { owner: BookingOwner } | { error: string; status: number };

/**
 * Missing or the caller's own id stays the caller.
 * Another id is allowed only for admin and back office, and only when that
 * person is in the organisation directory.
 */
export async function resolveBookingOwner(
  supabase: SupabaseClient<Database>,
  session: { userId: string; role: string },
  requestedId: string | null
): Promise<ResolveBookingOwnerResult> {
  const ownerId = requestedId && requestedId !== session.userId ? requestedId : session.userId;
  if (ownerId !== session.userId && !canManageAnyBooking(session.role)) {
    return { error: 'U kunt alleen voor uzelf reserveren.', status: 403 };
  }

  const { data, error } = await supabase.rpc('list_org_users');
  if (error) return { error: error.message, status: 500 };

  const match = (data ?? []).find((user) => user.id === ownerId);
  const email = match?.email?.trim().toLowerCase() ?? '';
  if (!match || !email) {
    return { error: 'Kies een bestaande gebruiker.', status: 400 };
  }

  const name = formatOrgUserDisplayName(match).slice(0, MAX_TITLE_LENGTH);
  return { owner: { id: match.id, email, name } };
}
