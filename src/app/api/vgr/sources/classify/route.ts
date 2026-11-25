import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { serviceRoleSupabase } from '@/lib/supabase/service-role';
import {
  classifyUploadHeuristic,
  classifyUploadWithAi,
} from '@/lib/vgr/sources/classify-upload';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/vgr/sources/classify (staging only)
 * Body: { employeeId, documentId?, filename, declaredAppType?, textSnippet?, documentDateHint?, persist?: boolean }
 *
 * Classifies a dump upload into pack + app type and extracts document_date.
 * When persist+documentId: updates documents.type + document_date (does not write VGR text — D01).
 */
export async function POST(req: NextRequest) {
  const stagingBlock = assertStagingOnly();
  if (stagingBlock) return stagingBlock;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = String(body.employeeId ?? '').trim();
    const filename = String(body.filename ?? '').trim();
    const documentId = String(body.documentId ?? '').trim();
    const declaredAppType =
      typeof body.declaredAppType === 'string' ? body.declaredAppType : null;
    const textSnippet = typeof body.textSnippet === 'string' ? body.textSnippet : null;
    const documentDateHint =
      typeof body.documentDateHint === 'string' ? body.documentDateHint : null;
    const persist = body.persist === true;
    const useAi = body.useAi !== false;

    if (!employeeId || !filename) {
      return NextResponse.json({ error: 'employeeId en filename zijn verplicht' }, { status: 400 });
    }

    const access = await requireEmployeeAccess(employeeId);
    if (isAuthError(access)) return access;

    let result = classifyUploadHeuristic({
      filename,
      declaredAppType,
      textSnippet,
      documentDateHint,
    });

    if (useAi && process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      result = await classifyUploadWithAi({
        openai,
        filename,
        declaredAppType,
        textSnippet,
        documentDateHint,
      });
    }

    let updated: Record<string, unknown> | null = null;
    if (persist && documentId) {
      const { data: existing, error: loadErr } = await access.supabase
        .from('documents')
        .select('id, employee_id')
        .eq('id', documentId)
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (loadErr || !existing) {
        return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 });
      }

      const patch: Record<string, unknown> = { type: result.app_type };
      if (result.document_date) patch.document_date = result.document_date;

      const { data: row, error: updErr } = await (serviceRoleSupabase as any)
        .from('documents')
        .update(patch)
        .eq('id', documentId)
        .eq('employee_id', employeeId)
        .select('id, type, name, uploaded_at, document_date')
        .single();
      if (updErr) {
        return NextResponse.json(
          { error: 'Classificatie opslaan mislukt', details: updErr.message },
          { status: 500 },
        );
      }
      updated = row as Record<string, unknown>;
    }

    return NextResponse.json({
      ok: true,
      classification: result,
      document: updated,
    });
  } catch (err) {
    console.error('❌ /api/vgr/sources/classify error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Classificatie mislukt', details: message }, { status: 500 });
  }
}
