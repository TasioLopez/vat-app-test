import { NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess, type AuthContext } from '@/lib/auth/api-auth';
import { isStagingEnv } from '@/lib/auth/staging-only';
import type { MeetingPurpose } from '@/lib/meetings/audio';

export async function requireMeetingEmployeeAccess(
  employeeId: string
): Promise<AuthContext | NextResponse> {
  const id = (employeeId || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
  }
  const access = await requireEmployeeAccess(id);
  if (isAuthError(access)) return access;
  return access;
}

/** @deprecated Use requireMeetingEmployeeAccess — meetings are enabled on production. */
export const requireStagingEmployeeAccess = requireMeetingEmployeeAccess;

/** VGR meeting purpose stays staging-only (pairs with hidden Gesprek VGR bron). */
export function assertMeetingPurposeAllowed(
  purpose: MeetingPurpose
): NextResponse | null {
  if (purpose !== 'vgr') return null;
  if (isStagingEnv()) return null;
  return NextResponse.json(
    { error: 'VGR-gesprek is alleen beschikbaar op staging' },
    { status: 403 }
  );
}
