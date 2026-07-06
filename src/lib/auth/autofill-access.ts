import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  isAuthError,
  requireEmployeeAccess,
  type AuthenticatedSupabase,
} from '@/lib/auth/api-auth';

export type AutofillAccessContext = {
  employeeId: string;
  supabase: AuthenticatedSupabase;
};

export function getEmployeeIdFromRequest(req: NextRequest): string | null {
  const fromQuery = req.nextUrl.searchParams.get('employeeId');
  if (fromQuery?.trim()) return fromQuery.trim();
  return null;
}

export async function requireEmployeeAutofillAccess(
  req: NextRequest
): Promise<AutofillAccessContext | NextResponse> {
  const employeeId = getEmployeeIdFromRequest(req);
  if (!employeeId) {
    return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
  }

  const authResult = await requireEmployeeAccess(employeeId);
  if (isAuthError(authResult)) return authResult;

  return { employeeId, supabase: authResult.supabase };
}

/** Service-role client for post-auth document downloads / OpenAI pipelines only. */
export function createServiceSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
