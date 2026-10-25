import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isAuthError, requireEmployeeAccess } from '@/lib/auth/api-auth';
import { serviceRoleSupabase } from '@/lib/supabase/service-role';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { generateVgrSection } from '@/lib/vgr/ai/generate-section';
import { isVgrAiSectionId } from '@/lib/vgr/ai/sections';
import type { VGRData } from '@/lib/vgr/schema';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/vgr/generate-section
 * Body: { employeeId, vgrInstanceId, sectionId, data?: VGRData (unsaved draft), instruction?: string }
 *
 * Returns a proposal; nothing is written server-side. The client stores the proposal in
 * `ai_proposals[sectionId]` and the adviser applies it explicitly ("Overnemen").
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = String(body.employeeId ?? '').trim();
    const vgrInstanceId = String(body.vgrInstanceId ?? '').trim();
    const sectionId = body.sectionId;
    const instruction = typeof body.instruction === 'string' ? body.instruction : undefined;

    if (!employeeId || !vgrInstanceId) {
      return NextResponse.json({ error: 'employeeId en vgrInstanceId zijn verplicht' }, { status: 400 });
    }
    if (!isVgrAiSectionId(sectionId)) {
      return NextResponse.json({ error: 'Onbekend onderdeel' }, { status: 400 });
    }

    const access = await requireEmployeeAccess(employeeId);
    if (isAuthError(access)) return access;

    // Instance must belong to the employee and be visible to the caller (RLS).
    const { data: instance, error: instErr } = await (access.supabase as any)
      .from('vgr_instances')
      .select('id, employee_id, data_json, prior_vgr_instance_id, prior_vgr_export_id')
      .eq('id', vgrInstanceId)
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (instErr || !instance) {
      return NextResponse.json({ error: 'Rapportage niet gevonden' }, { status: 404 });
    }

    const draft: VGRData = ensureVGRShape(
      body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : ((instance.data_json ?? {}) as Record<string, unknown>)
    );

    let prior: VGRData | null = null;
    const priorExportId = draft.vgr_meta.prior_vgr_export_id || instance.prior_vgr_export_id;
    const priorInstanceId = draft.vgr_meta.prior_vgr_instance_id || instance.prior_vgr_instance_id;
    if (priorExportId) {
      const { data: exp } = await (access.supabase as any).from('vgr_exports').select('snapshot_json').eq('id', priorExportId).maybeSingle();
      if (exp?.snapshot_json) prior = ensureVGRShape(exp.snapshot_json as Record<string, unknown>);
    }
    if (!prior && priorInstanceId) {
      const { data: pi } = await (access.supabase as any).from('vgr_instances').select('data_json').eq('id', priorInstanceId).maybeSingle();
      if (pi?.data_json) prior = ensureVGRShape(pi.data_json as Record<string, unknown>);
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ontbreekt op de server' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await generateVgrSection({
      openai,
      supabase: serviceRoleSupabase,
      employeeId,
      data: draft,
      prior,
      sectionId,
      extraInstruction: instruction,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('❌ /api/vgr/generate-section error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'AI-generatie mislukt', details: message }, { status: 500 });
  }
}
