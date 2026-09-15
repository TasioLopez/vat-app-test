import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { generateIntakeFromDossier } from '@/lib/intake/generate-from-dossier';
import { ensureIntakeShape } from '@/lib/intake/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const blocked = assertStagingOnly();
  if (blocked) return blocked;

  const body = await req.json().catch(() => null);
  const employeeId = body?.employeeId as string | undefined;
  const intakeInstanceId = body?.intakeInstanceId as string | undefined;

  if (!employeeId || !intakeInstanceId) {
    return NextResponse.json({ error: 'Missing employeeId or intakeInstanceId' }, { status: 400 });
  }

  const access = await requireEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const result = await generateIntakeFromDossier({ openai, supabase, employeeId });
    if (result.error && result.data.meta.generation_notes.length === 0) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const data = ensureIntakeShape(result.data);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await (supabase as any)
      .from('intake_instances')
      .update({
        data_json: data,
        validated_at: null,
        validated_by: null,
        updated_by: user?.id ?? null,
      })
      .eq('id', intakeInstanceId)
      .eq('employee_id', employeeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data_json: data,
      warning: result.error || null,
      conflicts: data.meta.conflicts,
    });
  } catch (e) {
    console.error('intake generate failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Generatie mislukt' },
      { status: 500 }
    );
  }
}
