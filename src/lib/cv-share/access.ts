import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import type { Database } from '@/types/supabase';
import { hashShareToken } from '@/lib/cv-share/tokens';
import { normalizeEmail } from '@/lib/cv-share/normalize-email';
import {
  getShareSessionFromCookies,
  parseShareSessionToken,
  type CvShareSessionPayload,
} from '@/lib/cv-share/session';

export type CvShareLinkRow = Database['public']['Tables']['cv_share_links']['Row'];

export function isShareLinkActive(row: CvShareLinkRow): boolean {
  if (row.revoked_at) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

/** Load share by raw URL token (service role). */
export async function getShareByRawToken(rawToken: string): Promise<CvShareLinkRow | null> {
  const tokenHash = hashShareToken(rawToken);
  const { data, error } = await supabaseAdmin
    .from('cv_share_links')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  if (!isShareLinkActive(data)) return null;
  return data;
}

/** Load share by id (service role). */
export async function getShareById(shareId: string): Promise<CvShareLinkRow | null> {
  const { data, error } = await supabaseAdmin
    .from('cv_share_links')
    .select('*')
    .eq('id', shareId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function revokeActiveSharesForCv(cvDocumentId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('cv_share_links')
    .update({ revoked_at: now })
    .eq('cv_document_id', cvDocumentId)
    .is('revoked_at', null);
}

export async function getActiveShareForCv(
  supabase: SupabaseClient,
  cvDocumentId: string,
  employeeId: string
): Promise<CvShareLinkRow | null> {
  const { data, error } = await supabase
    .from('cv_share_links')
    .select('*')
    .eq('cv_document_id', cvDocumentId)
    .eq('employee_id', employeeId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  if (!isShareLinkActive(data)) return null;
  return data;
}

export type GuestAccessContext = {
  share: CvShareLinkRow;
  session: CvShareSessionPayload;
};

/** Validate guest session cookie against share row. */
export async function validateGuestAccess(
  rawToken: string,
  sessionToken?: string | null
): Promise<GuestAccessContext | null> {
  const share = await getShareByRawToken(rawToken);
  if (!share) return null;

  let session: CvShareSessionPayload | null = null;
  if (sessionToken) {
    session = parseShareSessionToken(sessionToken);
  } else {
    session = await getShareSessionFromCookies();
  }
  if (!session) return null;
  if (session.shareId !== share.id) return null;
  if (session.cvId !== share.cv_document_id) return null;
  if (session.employeeId !== share.employee_id) return null;
  if (normalizeEmail(session.email) !== normalizeEmail(share.recipient_email)) return null;

  return { share, session };
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}

export const SHARE_DEFAULT_EXPIRY_DAYS = 30;

export function shareExpiresAt(days = SHARE_DEFAULT_EXPIRY_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
