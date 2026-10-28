import { NextResponse } from 'next/server';
import { isAuthError, requireEmployeeAccess, type AuthContext } from '@/lib/auth/api-auth';
import { assertStagingOnly } from '@/lib/auth/staging-only';

export async function requireStagingEmployeeAccess(
  employeeId: string
): Promise<AuthContext | NextResponse> {
  const blocked = assertStagingOnly();
  if (blocked) return blocked;
  const id = (employeeId || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
  }
  const access = await requireEmployeeAccess(id);
  if (isAuthError(access)) return access;
  return access;
}
