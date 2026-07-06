import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getSessionUserWithRole, isAdmin } from '@/lib/help/auth';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuthenticatedSupabase = SupabaseClient<Database>;

export type AuthContext = {
  user: User;
  supabase: AuthenticatedSupabase;
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Extract employee UUID prefix from a documents-bucket storage path. */
export function parseEmployeeIdFromDocumentPath(storagePath: string): string | null {
  const normalized = decodeURIComponent((storagePath || '').trim()).replace(/^\/+/, '');
  const withoutBucket = normalized.replace(/^documents\//i, '');
  const firstSegment = withoutBucket.split('/')[0]?.trim();
  if (!firstSegment || !isUuid(firstSegment)) return null;
  return firstSegment;
}

export async function createAuthenticatedClient(): Promise<AuthenticatedSupabase> {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

export async function requireAuth():
  Promise<AuthContext | NextResponse> {
  const supabase = await createAuthenticatedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { user, supabase };
}

export async function requireAdmin(): Promise<
  | { userId: string; email: string | undefined; role: string; supabase: AuthenticatedSupabase }
  | NextResponse
> {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const supabase = await createAuthenticatedClient();
  return { ...session, supabase };
}

export async function verifyEmployeeAccess(
  supabase: AuthenticatedSupabase,
  employeeId: string
): Promise<boolean> {
  if (!isUuid(employeeId)) return false;

  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function verifyDocumentPathAccess(
  supabase: AuthenticatedSupabase,
  storagePath: string
): Promise<boolean> {
  const employeeId = parseEmployeeIdFromDocumentPath(storagePath);
  if (!employeeId) return false;
  return verifyEmployeeAccess(supabase, employeeId);
}

export async function requireEmployeeAccess(
  employeeId: string
): Promise<AuthContext | NextResponse> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const allowed = await verifyEmployeeAccess(authResult.supabase, employeeId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return authResult;
}

export function isAuthError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
