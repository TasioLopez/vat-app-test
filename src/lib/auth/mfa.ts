import type { SupabaseClient } from '@supabase/supabase-js';

export type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status: string;
};

/**
 * Comma-separated emails that may skip MFA enrollment/challenge.
 * Server: MFA_OPTIONAL_EMAILS. Client login also needs NEXT_PUBLIC_MFA_OPTIONAL_EMAILS.
 */
export function parseMfaOptionalEmails(
  env: NodeJS.ProcessEnv = process.env
): Set<string> {
  const raw = [env.MFA_OPTIONAL_EMAILS, env.NEXT_PUBLIC_MFA_OPTIONAL_EMAILS]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(',');
  const emails = new Set<string>();
  for (const part of raw.split(',')) {
    const normalized = part.trim().toLowerCase();
    if (normalized) emails.add(normalized);
  }
  return emails;
}

export function isMfaOptionalEmail(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return parseMfaOptionalEmails(env).has(normalized);
}

/** Allowlisted accounts skip MFA enroll and AAL2 challenge entirely. */
export function maySkipMfaEnrollment(
  email: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isMfaOptionalEmail(email, env);
}

export async function listVerifiedTotpFactors(
  supabase: SupabaseClient
): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return (data.totp ?? []).filter((f) => f.status === 'verified');
}

export async function hasVerifiedTotp(supabase: SupabaseClient): Promise<boolean> {
  const factors = await listVerifiedTotpFactors(supabase);
  return factors.length > 0;
}

export async function getAssuranceLevel(
  supabase: SupabaseClient
): Promise<{ currentLevel: string | null; nextLevel: string | null }> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return {
    currentLevel: data.currentLevel ?? null,
    nextLevel: data.nextLevel ?? null,
  };
}

/** True when the user may use the app (AAL2, or no MFA factors yet → enroll wall). */
export async function needsMfaChallenge(supabase: SupabaseClient): Promise<boolean> {
  const verified = await listVerifiedTotpFactors(supabase);
  if (verified.length === 0) return false;
  const { currentLevel } = await getAssuranceLevel(supabase);
  return currentLevel !== 'aal2';
}

/**
 * Login URL for an existing AAL1 session that still needs TOTP.
 * Prefer MFA-only resume over forcing password again (does not weaken AAL2).
 */
export function mfaChallengeLoginPath(redirectPath?: string | null): string {
  const params = new URLSearchParams({ reason: 'mfa_required' });
  if (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
    params.set('redirect', redirectPath);
  }
  return `/login?${params.toString()}`;
}

export async function needsMfaEnroll(supabase: SupabaseClient): Promise<boolean> {
  return !(await hasVerifiedTotp(supabase));
}
