import { NextRequest, NextResponse } from 'next/server';
import { isAuthError } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
import { isNotesOrigin, isTranscriptSource } from '@/lib/meetings/audio';
import { insertMeetingCapture, listMeetingCaptures } from '@/lib/meetings/captures';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const employeeId = req.nextUrl.searchParams.get('employeeId') ?? '';
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const { data, error } = await listMeetingCaptures(access.supabase, employeeId);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ captures: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const employeeId = (body?.employeeId ?? '').toString();
  const access = await requireStagingEmployeeAccess(employeeId);
  if (isAuthError(access)) return access;

  const transcript = typeof body?.transcriptText === 'string' ? body.transcriptText.trim() : '';
  const notes = typeof body?.notesText === 'string' ? body.notesText.trim() : '';
  const consent = body?.consent === true;
  if (!transcript && !consent && !notes) {
    return NextResponse.json(
      { error: 'Plak een transcript, plak notities, of geef toestemming voor een opname.' },
      { status: 400 }
    );
  }

  const transcriptSource = isTranscriptSource(body?.transcriptSource)
    ? body.transcriptSource
    : transcript
      ? 'paste'
      : null;
  const notesOrigin = isNotesOrigin(body?.notesOrigin) ? body.notesOrigin : notes ? 'pasted' : null;

  const { data, error } = await insertMeetingCapture(access.supabase, {
    employee_id: employeeId,
    created_by: access.user.id,
    status: notes ? 'notes_draft' : transcript ? 'transcribed' : 'recorded',
    transcript_text: transcript || null,
    transcript_original_text: transcript || null,
    transcript_source: transcriptSource,
    notes_text: notes || null,
    notes_origin: notesOrigin,
    consent_at: consent ? new Date().toISOString() : null,
  });

  if (error || !data) {
    return NextResponse.json({ error: error || 'Opslaan mislukt' }, { status: 500 });
  }
  return NextResponse.json({ capture: data });
}
