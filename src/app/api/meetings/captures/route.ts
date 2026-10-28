import { NextRequest, NextResponse } from 'next/server';
import { isAuthError } from '@/lib/auth/api-auth';
import { requireStagingEmployeeAccess } from '@/lib/meetings/access';
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
  const consent = body?.consent === true;
  if (!transcript && !consent) {
    return NextResponse.json(
      { error: 'Plak een transcript of geef toestemming voor een opname.' },
      { status: 400 }
    );
  }

  const { data, error } = await insertMeetingCapture(access.supabase, {
    employee_id: employeeId,
    created_by: access.user.id,
    status: transcript ? 'transcribed' : 'recorded',
    transcript_text: transcript || null,
    consent_at: consent ? new Date().toISOString() : null,
  });

  if (error || !data) {
    return NextResponse.json({ error: error || 'Opslaan mislukt' }, { status: 500 });
  }
  return NextResponse.json({ capture: data });
}
