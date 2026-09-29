import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { getIntakeSourcesSummary } from '@/lib/intake/sources';

export const dynamic = 'force-dynamic';

async function getAuthedClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

/** Metadata-only preflight for Invullen chooser (no LLM, no download). */
export async function GET(req: NextRequest) {
  const blocked = assertStagingOnly();
  if (blocked) return blocked;

  const employeeId = req.nextUrl.searchParams.get('employeeId') || undefined;
  if (!employeeId) {
    return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
  }

  const access = await requireEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const supabase = await getAuthedClient();
  const summary = await getIntakeSourcesSummary(supabase, employeeId);
  return NextResponse.json(summary);
}
