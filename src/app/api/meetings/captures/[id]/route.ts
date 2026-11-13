import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, isUuid } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import {
  applyTranscriptWrite,
  isMeetingPurpose,
  isNotesOrigin,
  isTranscriptSource,
  restoreTranscriptText,
} from '@/lib/meetings/audio';
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
  if (body?.restoreTranscript === true) {
    const restored = restoreTranscriptText(existing.data.transcript_original_text);
    if (!restored.ok) {
      return NextResponse.json({ error: 'Geen origineel transcript.' }, { status: 400 });
    }
    patch.transcript_text = restored.transcript_text;
    if (existing.data.status === 'recorded') patch.status = 'transcribed';
  } else if (typeof body?.transcriptText === 'string') {
    const source = isTranscriptSource(body?.transcriptSource) ? body.transcriptSource : null;
    Object.assign(
      patch,
      applyTranscriptWrite({
        existingOriginal: existing.data.transcript_original_text,
        nextText: body.transcriptText,
        source,
      })
    );
    if (existing.data.status === 'recorded' && String(patch.transcript_text ?? '').trim()) {
      patch.status = 'transcribed';
    }
  }
  if (typeof body?.notesText === 'string') {
    const notesText = body.notesText.trim();
    patch.notes_text = notesText;
    if (isNotesOrigin(body?.notesOrigin)) patch.notes_origin = body.notesOrigin;
    else if (!existing.data.notes_origin && notesText) patch.notes_origin = 'pasted';
    patch.status = 'notes_draft';
    if (existing.data.status === 'accepted') patch.notes_document_id = null;
  }
  if (body?.consent === true && !existing.data.consent_at) {
    patch.consent_at = new Date().toISOString();
  }
  if (isMeetingPurpose(body?.purpose) && body.purpose !== existing.data.purpose) {
    patch.purpose = body.purpose;
    if (existing.data.status === 'accepted') {
      patch.status = 'notes_draft';
      patch.notes_document_id = null;
    }
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
