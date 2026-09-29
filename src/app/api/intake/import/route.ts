import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { importIntakeFromPdf } from '@/lib/intake/import-from-pdf';
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
  const existing = body?.data_json;

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
    const result = await importIntakeFromPdf({
      openai,
      supabase,
      employeeId,
      existingData: existing,
    });

    if (result.error && !result.sourceDocumentId) {
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
        source_document_id: result.sourceDocumentId,
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
      source_document_id: result.sourceDocumentId,
      warning: result.error || null,
    });
  } catch (e) {
    console.error('intake import failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import mislukt' },
      { status: 500 }
    );
  }
}
