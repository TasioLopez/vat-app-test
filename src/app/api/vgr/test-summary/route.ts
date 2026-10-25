import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { serviceRoleSupabase } from '@/lib/supabase/service-role';
import { generateVgrTestSummary } from '@/lib/vgr/ai/test-summary';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/vgr/test-summary
 * Body: { employeeId, documentIds: string[] }
 * Returns a draft `VGRTestSummary` (status 'draft'); the adviser inserts it explicitly.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = String(body.employeeId ?? '').trim();
    const documentIds = Array.isArray(body.documentIds) ? body.documentIds.filter((x): x is string => typeof x === 'string') : [];
    if (!employeeId) return NextResponse.json({ error: 'employeeId is verplicht' }, { status: 400 });
    if (!documentIds.length) return NextResponse.json({ error: 'Selecteer minimaal één testrapport' }, { status: 400 });

    const access = await requireEmployeeAccess(employeeId);
    if (isAuthError(access)) return access;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ontbreekt op de server' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await generateVgrTestSummary({ openai, supabase: serviceRoleSupabase, employeeId, documentIds });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 200 });

    return NextResponse.json({ ok: true, summary: result.summary, issues: result.issues });
  } catch (err) {
    console.error('❌ /api/vgr/test-summary error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Testsamenvatting mislukt', details: message }, { status: 500 });
  }
}
