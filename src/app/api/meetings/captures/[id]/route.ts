import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, isUuid } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import {
  deleteMeetingCapture,
  getMeetingCapture,
  updateMeetingCapture,
} from '@/lib/meetings/captures';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const employeeId = (body?.employeeId ?? '').toString();
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;
  if (!isUuid(id)) return NextResponse.json({ error: 'Ongeldig gesprek' }, { status: 400 });

  const existing = await getMeetingCapture(access.supabase, employeeId, id);
  if (existing.error) return NextResponse.json({ error: existing.error }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: 'Gesprek niet gevonden' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (typeof body?.transcriptText === 'string') {
    patch.transcript_text = body.transcriptText.trim();
    if (existing.data.status === 'recorded') patch.status = 'transcribed';
  }
  if (typeof body?.notesText === 'string') {
    patch.notes_text = body.notesText.trim();
    if (existing.data.status !== 'accepted') patch.status = 'notes_draft';
  }
  if (body?.consent === true && !existing.data.consent_at) {
    patch.consent_at = new Date().toISOString();
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Niets om op te slaan' }, { status: 400 });
  }

  const updated = await updateMeetingCapture(access.supabase, employeeId, id, patch);
  if (updated.error || !updated.data) {
    return NextResponse.json({ error: updated.error || 'Opslaan mislukt' }, { status: 500 });
  }
  return NextResponse.json({ capture: updated.data });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const employeeId = req.nextUrl.searchParams.get('employeeId') ?? '';
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;
  if (!isUuid(id)) return NextResponse.json({ error: 'Ongeldig gesprek' }, { status: 400 });

  const existing = await getMeetingCapture(access.supabase, employeeId, id);
  if (existing.error) return NextResponse.json({ error: existing.error }, { status: 500 });
  if (!existing.data) return NextResponse.json({ error: 'Gesprek niet gevonden' }, { status: 404 });

  if (existing.data.audio_path) {
    await supabaseAdmin.storage.from('documents').remove([existing.data.audio_path]);
  }

  const removed = await deleteMeetingCapture(access.supabase, employeeId, id);
  if (removed.error) return NextResponse.json({ error: removed.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
