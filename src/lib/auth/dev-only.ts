import { NextResponse } from 'next/server';
import { getSessionUserWithRole, isAdmin } from '@/lib/help/auth';

/** Restrict diagnostic endpoints to development or admins. */
export async function assertDevOrAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  const session = await getSessionUserWithRole();
  if (session && isAdmin(session.role)) {
    return null;
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
