import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { persistIntakeDraft } from '@/lib/intake/persist-draft';
import { ensureIntakeShape } from '@/lib/intake/schema';

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

/** Persist intake draft (and optionally validate/project). */
export async function POST(req: NextRequest) {
  const blocked = assertStagingOnly();
  if (blocked) return blocked;

  const body = await req.json().catch(() => null);
  const intakeInstanceId = body?.intakeInstanceId as string | undefined;
  const employeeId = body?.employeeId as string | undefined;
  const validate = Boolean(body?.validate);
  const dataJson = body?.data_json;

  if (!intakeInstanceId || !employeeId || dataJson == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const access = await requireEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const supabase = await getAuthedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await persistIntakeDraft(supabase, {
    intakeInstanceId,
    employeeId,
    intakeData: ensureIntakeShape(dataJson),
    userId: user?.id ?? null,
    validate,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    validated_at: result.validated_at ?? null,
  });
}
