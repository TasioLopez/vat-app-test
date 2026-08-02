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

/** Revoke active share links on this CV and on any child copies of this parent. */
export async function revokeActiveSharesForParentAndChildren(
  parentCvId: string,
  employeeId: string
): Promise<void> {
  const now = new Date().toISOString();
  await revokeActiveSharesForCv(parentCvId);

  const { data: children } = await supabaseAdmin
    .from('cv_documents')
    .select('id')
    .eq('parent_cv_id', parentCvId)
    .eq('employee_id', employeeId);

  const childIds = (children ?? []).map((c) => c.id as string);
  if (childIds.length === 0) return;

  await supabaseAdmin
    .from('cv_share_links')
    .update({ revoked_at: now })
    .in('cv_document_id', childIds)
    .is('revoked_at', null);

  await supabaseAdmin
    .from('cv_documents')
    .update({ status: 'draft' })
    .in('id', childIds)
    .eq('employee_id', employeeId)
    .eq('status', 'shared_for_review');
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

/**
 * Active share for a CV id: direct link on this document, or on a child copy
 * when viewing the parent.
 */
export async function getActiveShareForCvOrChildren(
  supabase: SupabaseClient,
  cvDocumentId: string,
  employeeId: string
): Promise<(CvShareLinkRow & { childCvId?: string }) | null> {
  const direct = await getActiveShareForCv(supabase, cvDocumentId, employeeId);
  if (direct) return direct;

  const { data: children } = await supabase
    .from('cv_documents')
    .select('id')
    .eq('parent_cv_id', cvDocumentId)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  for (const child of children ?? []) {
    const share = await getActiveShareForCv(supabase, child.id as string, employeeId);
    if (share) {
      return { ...share, childCvId: child.id as string };
    }
  }
  return null;
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
