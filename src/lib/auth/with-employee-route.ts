import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { isAuthError, requireAuth, verifyEmployeeAccess } from '@/lib/auth/api-auth';

export type EmployeeRouteContext = {
  req: NextRequest;
  employeeId: string;
  user: User;
  supabase: SupabaseClient<Database>;
};

type EmployeeRouteHandler = (ctx: EmployeeRouteContext) => Promise<NextResponse>;

function employeeIdFromQuery(req: NextRequest): string | null {
  const fromSearch = req.nextUrl.searchParams.get('employeeId');
  if (fromSearch?.trim()) return fromSearch.trim();
  return null;
}

export function withEmployeeAutofill(handler: EmployeeRouteHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const employeeId = employeeIdFromQuery(req);
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const allowed = await verifyEmployeeAccess(authResult.supabase, employeeId);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler({
      req,
      employeeId,
      user: authResult.user,
      supabase: authResult.supabase,
    });
  };
}
