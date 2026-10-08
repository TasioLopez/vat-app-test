import { NextResponse } from 'next/server';

/** True when the app is running as the staging deployment (banner, etc.). */
export function isStagingEnv(): boolean {
  return process.env.NEXT_PUBLIC_APP_ENV === 'staging';
}

/**
 * Restrict APIs that must stay staging-only.
 * Returns a 404 response when not staging; null when allowed.
 */
export function assertStagingOnly(): NextResponse | null {
  if (isStagingEnv()) return null;
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
