import type { SupabaseClient } from '@supabase/supabase-js';

export type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status: string;
};

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

export async function needsMfaEnroll(supabase: SupabaseClient): Promise<boolean> {
  return !(await hasVerifiedTotp(supabase));
}
